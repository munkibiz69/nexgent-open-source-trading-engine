/**
 * Redis Agent Service
 * 
 * Handles caching of active agent IDs in Redis.
 * Used for fast iteration of agents during signal processing.
 */

import { redisService } from './redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';

export type TradingMode = 'simulation' | 'live';

export class RedisAgentService {
  private static instance: RedisAgentService;

  private constructor() {}

  public static getInstance(): RedisAgentService {
    if (!RedisAgentService.instance) {
      RedisAgentService.instance = new RedisAgentService();
    }
    return RedisAgentService.instance;
  }

  /**
   * Add agent to active set and cache automated trading status for both modes
   * @param agentId - Agent ID
   * @param tradingMode - Current trading mode
   * @param automatedTradingSimulation - Whether automated trading is enabled for simulation mode (default: true)
   * @param automatedTradingLive - Whether automated trading is enabled for live mode (default: true)
   */
  public async addActiveAgent(
    agentId: string, 
    tradingMode: TradingMode = 'simulation',
    automatedTradingSimulation: boolean = true,
    automatedTradingLive: boolean = true
  ): Promise<void> {
    await redisService.getClient().sadd(REDIS_KEYS.ACTIVE_AGENTS, agentId);
    await this.setTradingMode(agentId, tradingMode);
    await this.setAutomatedTrading(agentId, 'simulation', automatedTradingSimulation);
    await this.setAutomatedTrading(agentId, 'live', automatedTradingLive);
  }

  /**
   * Set trading mode for an agent
   * @param agentId - Agent ID
   * @param mode - Trading mode ('simulation' or 'live')
   */
  public async setTradingMode(agentId: string, mode: TradingMode): Promise<void> {
    const key = REDIS_KEYS.AGENT_TRADING_MODE(agentId);
    await redisService.getClient().set(key, mode);
  }

  /**
   * Get trading mode for an agent
   * Returns 'simulation' if not set (default)
   * @param agentId - Agent ID
   * @returns Trading mode
   */
  public async getTradingMode(agentId: string): Promise<TradingMode> {
    const key = REDIS_KEYS.AGENT_TRADING_MODE(agentId);
    const value = await redisService.getClient().get(key);
    return (value === 'live' ? 'live' : 'simulation') as TradingMode;
  }

  /**
   * Remove agent from active set and clean up all cached data
   */
  public async removeActiveAgent(agentId: string): Promise<void> {
    const client = redisService.getClient();
    await client.srem(REDIS_KEYS.ACTIVE_AGENTS, agentId);
    await client.del(REDIS_KEYS.AGENT_TRADING_MODE(agentId));
    await this.removeAutomatedTrading(agentId, 'simulation');
    await this.removeAutomatedTrading(agentId, 'live');
  }

  /**
   * Set automated trading status for an agent in a specific mode
   * @param agentId - Agent ID
   * @param mode - Trading mode ('simulation' or 'live')
   * @param enabled - Whether automated trading is enabled
   */
  public async setAutomatedTrading(agentId: string, mode: TradingMode, enabled: boolean): Promise<void> {
    const key = REDIS_KEYS.AGENT_AUTOMATED_TRADING(agentId, mode);
    await redisService.getClient().set(key, enabled ? '1' : '0');
  }

  /**
   * Get automated trading status for an agent in a specific mode
   * Returns true if not set (default behavior for backwards compatibility)
   * @param agentId - Agent ID
   * @param mode - Trading mode ('simulation' or 'live')
   * @returns Whether automated trading is enabled for the specified mode
   */
  public async getAutomatedTrading(agentId: string, mode: TradingMode): Promise<boolean> {
    const key = REDIS_KEYS.AGENT_AUTOMATED_TRADING(agentId, mode);
    const value = await redisService.getClient().get(key);
    // Default to true if not set (backwards compatibility)
    return value !== '0';
  }

  /**
   * Check if automated trading is enabled for agent's current trading mode
   * Uses Redis pipeline to fetch all data in ONE round trip (optimized)
   * @param agentId - Agent ID
   * @returns Whether automated trading is enabled for the agent's current mode
   */
  public async isAutomatedTradingEnabled(agentId: string): Promise<boolean> {
    const client = redisService.getClient();
    const pipeline = client.pipeline();
    
    // Batch all gets into one round trip
    pipeline.get(REDIS_KEYS.AGENT_TRADING_MODE(agentId));
    pipeline.get(REDIS_KEYS.AGENT_AUTOMATED_TRADING(agentId, 'simulation'));
    pipeline.get(REDIS_KEYS.AGENT_AUTOMATED_TRADING(agentId, 'live'));
    
    const results = await pipeline.exec();
    if (!results) return true; // Default to enabled if pipeline fails
    
    // results[i] = [error, value]
    const tradingMode = results[0]?.[1] === 'live' ? 'live' : 'simulation';
    const value = tradingMode === 'live' ? results[2]?.[1] : results[1]?.[1];
    
    // Default to true if not set (backwards compatibility)
    return value !== '0';
  }

  /**
   * Remove automated trading status from cache for a specific mode
   * @param agentId - Agent ID
   * @param mode - Trading mode ('simulation' or 'live')
   */
  public async removeAutomatedTrading(agentId: string, mode: TradingMode): Promise<void> {
    const key = REDIS_KEYS.AGENT_AUTOMATED_TRADING(agentId, mode);
    await redisService.getClient().del(key);
  }

  /**
   * Get all active agent IDs
   */
  public async getActiveAgentIds(): Promise<string[]> {
    return await redisService.getClient().smembers(REDIS_KEYS.ACTIVE_AGENTS);
  }

  /**
   * Clear all active agents from the set
   */
  public async clearActiveAgents(): Promise<void> {
    await redisService.getClient().del(REDIS_KEYS.ACTIVE_AGENTS);
  }

  /**
   * Sync active agents set with a list of agent IDs
   * Removes agents not in the list and adds missing ones
   */
  public async syncActiveAgents(agentIds: string[]): Promise<void> {
    const client = redisService.getClient();
    const key = REDIS_KEYS.ACTIVE_AGENTS;
    
    // Get current agents in the set
    const currentAgentIds = await client.smembers(key);
    const currentSet = new Set(currentAgentIds);
    const targetSet = new Set(agentIds);
    
    // Find agents to remove (in current but not in target)
    const toRemove = currentAgentIds.filter(id => !targetSet.has(id));
    
    // Find agents to add (in target but not in current)
    const toAdd = agentIds.filter(id => !currentSet.has(id));
    
    // Perform updates
    if (toRemove.length > 0) {
      await client.srem(key, ...toRemove);
    }
    if (toAdd.length > 0) {
      await client.sadd(key, ...toAdd);
    }
  }
}

export const redisAgentService = RedisAgentService.getInstance();
