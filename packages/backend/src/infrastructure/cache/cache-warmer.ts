/**
 * Cache Warmer Service
 * 
 * Populates Redis cache with hot data from the database on startup.
 * Ensures the system starts with a warm cache for high performance.
 */

import { prisma } from '@/infrastructure/database/client.js';
import { redisPositionService } from './redis-position-service.js';
import { redisBalanceService } from './redis-balance-service.js';
import { redisConfigService } from './redis-config-service.js';
import { redisAgentService } from './redis-agent-service.js';
import { configService } from '@/domain/trading/config-service.js';

export class CacheWarmer {
  private static instance: CacheWarmer;

  private constructor() {}

  public static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  /**
   * Warm up the cache
   */
  public async warmup(): Promise<void> {
    console.log('🔥 Starting cache warmup...');
    const startTime = Date.now();

    try {
      // 1. Warm up agent configurations
      await this.warmupConfigs();

      // 2. Warm up positions
      await this.warmupPositions();

      // 3. Warm up balances
      await this.warmupBalances();

      const duration = Date.now() - startTime;
      console.log(`✅ Cache warmup complete in ${duration}ms`);
    } catch (error) {
      console.error('❌ Cache warmup failed:', error);
      // Don't throw, allow system to start even if cache is cold
    }
  }

  /**
   * Warm up agent configurations
   */
  private async warmupConfigs(): Promise<void> {
    console.log('  Loading agent configurations...');
    
    const agents = await prisma.agent.findMany({
      select: { 
        id: true, 
        tradingMode: true,
        tradingConfig: true, 
        automatedTradingSimulation: true,
        automatedTradingLive: true,
      },
    });

    if (agents.length === 0) {
      console.warn('  ⚠️  No agents found in database. Cache will be empty.');
      // Clear active agents set if no agents exist
      await redisAgentService.clearActiveAgents();
      return;
    }

    // Sync active agents set with database (removes stale, adds missing)
    const agentIds = agents.map(a => a.id);
    await redisAgentService.syncActiveAgents(agentIds);
    console.log(`  -> Synced active_agents set with ${agentIds.length} agents from database`);

    let count = 0;
    for (const agent of agents) {
      try {
        // Use config service to merge with defaults before caching
        const config = configService.mergeWithDefaults(agent.tradingConfig);
        await redisConfigService.setAgentConfig(agent.id, config);
        
        // Cache trading mode
        await redisAgentService.setTradingMode(agent.id, agent.tradingMode as 'simulation' | 'live');
        
        // Cache automated trading status for both modes
        await redisAgentService.setAutomatedTrading(agent.id, 'simulation', agent.automatedTradingSimulation);
        await redisAgentService.setAutomatedTrading(agent.id, 'live', agent.automatedTradingLive);
        
        count++;
      } catch (error) {
        console.error(`  ❌ Failed to cache config for agent ${agent.id}:`, error);
      }
    }
    
    console.log(`  -> Cached ${count} agent configurations (including automatedTrading status for both modes)`);
  }

  /**
   * Warm up active positions
   */
  private async warmupPositions(): Promise<void> {
    console.log('  Loading active positions...');
    
    // Only load open positions (assuming 'active' status or similar implies open)
    // Since we don't have a status field on AgentPosition, we load all.
    // In a real system, we'd likely filter by status if we kept history in the same table.
    // Based on schema, AgentPosition seems to be active positions only (history is in HistoricalSwap).
    const positions = await prisma.agentPosition.findMany();

    let count = 0;
    for (const position of positions) {
      await redisPositionService.setPosition(position);
      count++;
    }
    
    console.log(`  -> Cached ${count} active positions`);
  }

  /**
   * Warm up balances
   */
  private async warmupBalances(): Promise<void> {
    console.log('  Loading balances...');
    
    // Load all balances
    // Note: If there are too many, we might want to batch this or only load active agents
    const balances = await prisma.agentBalance.findMany();

    let count = 0;
    for (const balance of balances) {
      await redisBalanceService.setBalance({
        id: balance.id,
        agentId: balance.agentId,
        walletAddress: balance.walletAddress,
        tokenAddress: balance.tokenAddress,
        tokenSymbol: balance.tokenSymbol,
        balance: balance.balance,
        lastUpdated: balance.lastUpdated
      });
      count++;
    }
    
    console.log(`  -> Cached ${count} balances`);
  }
}

export const cacheWarmer = CacheWarmer.getInstance();

