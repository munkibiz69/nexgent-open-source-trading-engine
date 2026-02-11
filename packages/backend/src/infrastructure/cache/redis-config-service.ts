/**
 * Redis Config Service
 * 
 * Handles caching of agent trading configurations in Redis.
 */

import { redisService } from './redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';
import type { AgentTradingConfig } from '@nexgent/shared';

export class RedisConfigService {
  private static instance: RedisConfigService;

  private constructor() { }

  public static getInstance(): RedisConfigService {
    if (!RedisConfigService.instance) {
      RedisConfigService.instance = new RedisConfigService();
    }
    return RedisConfigService.instance;
  }

  /**
   * Get agent config from cache
   */
  public async getAgentConfig(agentId: string): Promise<AgentTradingConfig | null> {
    const key = REDIS_KEYS.AGENT_CONFIG(agentId);
    const data = await redisService.get(key);

    if (!data) {
      return null;
    }

    try {
      return JSON.parse(data) as AgentTradingConfig;
    } catch (error) {
      console.error(`[RedisConfigService] Failed to parse config for agent ${agentId}:`, error);
      return null;
    }
  }

  /**
   * Cache agent config
   * No TTL - configs are invalidated explicitly via write-through pattern
   */
  public async setAgentConfig(agentId: string, config: AgentTradingConfig): Promise<void> {
    const key = REDIS_KEYS.AGENT_CONFIG(agentId);
    await redisService.set(key, JSON.stringify(config));
  }

  /**
   * Invalidate agent config cache
   */
  public async invalidateAgentConfig(agentId: string): Promise<void> {
    const key = REDIS_KEYS.AGENT_CONFIG(agentId);
    await redisService.del(key);
  }
}

export const redisConfigService = RedisConfigService.getInstance();
