/**
 * Agent Service
 * 
 * Handles agent creation, updates, deletion, and configuration management.
 * Manages cache synchronization using write-through pattern (DB first, then cache).
 * Follows the same pattern as PositionService and BalanceService.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/client.js';
import type { IAgentRepository } from './agent.repository.js';
import { AgentRepository } from '@/infrastructure/database/repositories/agent.repository.js';
import { walletService } from '@/infrastructure/wallets/index.js';
import { configService } from '@/domain/trading/config-service.js';
import { redisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisAgentService } from '@/infrastructure/cache/redis-agent-service.js';
import { redisPositionService } from '@/infrastructure/cache/redis-position-service.js';
import { redisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import type { AgentTradingConfig } from '@nexgent/shared';

/**
 * Agent service error
 */
export class AgentServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AgentServiceError';
  }
}

/**
 * Create agent data
 */
export interface CreateAgentData {
  userId: string;
  name: string;
  tradingMode?: 'simulation' | 'live';
}

/**
 * Update agent data
 */
export interface UpdateAgentData {
  name?: string;
  tradingMode?: 'simulation' | 'live';
  automatedTradingSimulation?: boolean;
  automatedTradingLive?: boolean;
}

/**
 * Agent Service
 * 
 * Service for managing agent operations with automatic cache synchronization.
 * Uses write-through pattern: DB first (source of truth), then cache.
 */
class AgentService {
  constructor(private readonly agentRepo: IAgentRepository) {}

  /**
   * Create agent with automatic cache sync
   * 
   * Follows write-through pattern: DB first, then cache.
   * Auto-creates simulation wallet and syncs cache.
   * 
   * @param data - Agent creation data
   * @returns Created agent
   * @throws AgentServiceError if creation fails
   */
  async createAgent(data: CreateAgentData): Promise<Prisma.AgentGetPayload<Record<string, never>>> {
    const finalTradingMode = data.tradingMode || 'simulation';

    // 1. Create agent in DB (source of truth)
    const agent = await this.agentRepo.create({
      user: { connect: { id: data.userId } },
      name: data.name.trim(),
      tradingMode: finalTradingMode,
    });

    // 2. Auto-create simulation wallet when agent is created
    // Generate non-valid wallet address with sim_ prefix (no private key stored - simulation doesn't execute on-chain)
    const simulationAddress = walletService.generateSimulationAddress();
    await prisma.agentWallet.create({
      data: {
        agentId: agent.id,
        walletAddress: simulationAddress.address,
        walletType: 'simulation',
      },
    });

    // 3. Sync cache (write-through)
    // Cache sync is best-effort - don't fail agent creation if it fails
    try {
      await this.syncAgentCache(agent);
      console.log(`[AgentService] ✅ Cached config and added agent ${agent.id} to active set`);
    } catch (error) {
      // Log but don't throw - cache sync is best-effort
      console.error(`[AgentService] ⚠️  Failed to sync cache for agent ${agent.id}:`, error);
      if (error instanceof Error) {
        console.error(`[AgentService] Error details: ${error.message}`, error.stack);
      }
    }

    console.log(`[AgentService] ✅ Created agent ${agent.id} with auto-generated simulation wallet ${simulationAddress.address}`);

    return agent;
  }

  /**
   * Update agent with cache invalidation if needed
   * 
   * Invalidates config cache if tradingMode changes.
   * 
   * @param id - Agent ID
   * @param data - Update data
   * @returns Updated agent
   * @throws AgentServiceError if agent not found or update fails
   */
  async updateAgent(
    id: string,
    data: UpdateAgentData
  ): Promise<Prisma.AgentGetPayload<Record<string, never>>> {
    // Load existing agent to check for tradingMode change
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new AgentServiceError(
        `Agent not found: ${id}`,
        'AGENT_NOT_FOUND'
      );
    }

    // 1. Update agent in DB (source of truth)
    const updateData: Prisma.AgentUpdateInput = {};
    if (data.name !== undefined) {
      updateData.name = data.name.trim();
    }
    if (data.tradingMode !== undefined) {
      updateData.tradingMode = data.tradingMode;
    }
    if (data.automatedTradingSimulation !== undefined) {
      updateData.automatedTradingSimulation = data.automatedTradingSimulation;
    }
    if (data.automatedTradingLive !== undefined) {
      updateData.automatedTradingLive = data.automatedTradingLive;
    }

    const agent = await this.agentRepo.update(id, updateData);

    // 2. Invalidate/update caches
    try {
      // Invalidate config cache if tradingMode changed
      if (data.tradingMode !== undefined && data.tradingMode !== existing.tradingMode) {
        await redisConfigService.invalidateAgentConfig(id);
        await redisAgentService.setTradingMode(id, data.tradingMode);
        console.log(`[AgentService] ✅ Updated tradingMode cache for agent ${id}: ${data.tradingMode}`);
      }

      // Update Redis cache for automatedTrading (mode-specific)
      if (data.automatedTradingSimulation !== undefined) {
        await redisAgentService.setAutomatedTrading(id, 'simulation', data.automatedTradingSimulation);
        console.log(`[AgentService] ✅ Updated automatedTradingSimulation cache for agent ${id}: ${data.automatedTradingSimulation}`);
      }
      if (data.automatedTradingLive !== undefined) {
        await redisAgentService.setAutomatedTrading(id, 'live', data.automatedTradingLive);
        console.log(`[AgentService] ✅ Updated automatedTradingLive cache for agent ${id}: ${data.automatedTradingLive}`);
      }
    } catch (error) {
      // Log but don't throw - cache update is best-effort
      console.error(`[AgentService] ⚠️  Failed to update cache for agent ${id}:`, error);
    }

    return agent;
  }

  /**
   * Delete agent with complete cache cleanup
   * 
   * Removes agent from database (cascade deletes related data) and cleans up all cache entries.
   * 
   * @param id - Agent ID
   * @throws AgentServiceError if agent not found or deletion fails
   */
  async deleteAgent(id: string): Promise<void> {
    // Verify agent exists
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new AgentServiceError(
        `Agent not found: ${id}`,
        'AGENT_NOT_FOUND'
      );
    }

    // 1. Delete agent in DB (cascade deletes related data: wallets, positions, balances, etc.)
    await this.agentRepo.delete(id);

    // 2. Cleanup cache (write-through)
    // Cache cleanup is best-effort - don't fail deletion if it fails
    try {
      await this.cleanupAgentCache(id);
      console.log(`[AgentService] ✅ Cleaned up cache for deleted agent ${id}`);
    } catch (error) {
      // Log but don't throw - cache cleanup is best-effort
      console.error(`[AgentService] ⚠️  Failed to cleanup cache for agent ${id}:`, error);
      if (error instanceof Error) {
        console.error(`[AgentService] Error details: ${error.message}`, error.stack);
      }
    }
  }

  /**
   * Update agent trading configuration with cache invalidation
   * 
   * Saves config to database and invalidates cache.
   * 
   * @param id - Agent ID
   * @param config - Trading configuration (null to reset to defaults)
   * @returns Updated configuration (merged with defaults)
   * @throws AgentServiceError if agent not found or config is invalid
   */
  async updateAgentConfig(
    id: string,
    config: AgentTradingConfig | null
  ): Promise<AgentTradingConfig> {
    // Verify agent exists
    const existing = await this.agentRepo.findById(id);
    if (!existing) {
      throw new AgentServiceError(
        `Agent not found: ${id}`,
        'AGENT_NOT_FOUND'
      );
    }

    // 1. Save config in DB (via configService - handles validation and cache invalidation)
    await configService.saveAgentConfig(id, config);

    // 2. Reload config (will be cached on next access via loadAgentConfig)
    // Note: configService.saveAgentConfig() already invalidates cache
    const updatedConfig = await configService.loadAgentConfig(id);

    return updatedConfig;
  }

  /**
   * Sync agent cache (private helper)
   * 
   * Caches config, tradingMode, automatedTrading status, and adds agent to active agents set.
   * 
   * @param agent - Agent to sync
   */
  private async syncAgentCache(agent: Prisma.AgentGetPayload<Record<string, never>>): Promise<void> {
    // Cache config (merge with defaults)
    const config = configService.mergeWithDefaults(agent.tradingConfig);
    await redisConfigService.setAgentConfig(agent.id, config);

    // Add to active agents set and cache tradingMode + automatedTrading status for both modes
    await redisAgentService.addActiveAgent(
      agent.id, 
      agent.tradingMode as 'simulation' | 'live',
      agent.automatedTradingSimulation,
      agent.automatedTradingLive
    );
  }

  /**
   * Cleanup agent cache (private helper)
   * 
   * Removes all cache entries related to the agent.
   * 
   * @param agentId - Agent ID
   */
  private async cleanupAgentCache(agentId: string): Promise<void> {
    await Promise.all([
      redisAgentService.removeActiveAgent(agentId),
      redisConfigService.invalidateAgentConfig(agentId),
      redisPositionService.deleteAgentPositions(agentId),
      redisBalanceService.deleteAgentBalances(agentId),
    ]);
  }
}

// Export singleton instance
export const agentService = new AgentService(new AgentRepository());

// Export class for testing or custom instances
export { AgentService };

