/**
 * Redis Balance Service
 * 
 * Handles caching of agent balances in Redis.
 * Used to avoid frequent database lookups during trading execution.
 */

import { redisService } from './redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';

/**
 * Cached agent balance structure
 */
export interface CachedAgentBalance {
  id: string;
  agentId: string;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
  lastUpdated: Date;
}

export class RedisBalanceService {
  private static instance: RedisBalanceService;

  private constructor() { }

  public static getInstance(): RedisBalanceService {
    if (!RedisBalanceService.instance) {
      RedisBalanceService.instance = new RedisBalanceService();
    }
    return RedisBalanceService.instance;
  }

  /**
   * Get balance from cache
   */
  public async getBalance(agentId: string, walletAddress: string, tokenAddress: string): Promise<CachedAgentBalance | null> {
    const key = REDIS_KEYS.BALANCE(agentId, walletAddress, tokenAddress);
    const data = await redisService.get(key);

    if (!data) return null;

    try {
      const balance = JSON.parse(data);
      return {
        ...balance,
        lastUpdated: new Date(balance.lastUpdated),
      };
    } catch (error) {
      console.error(`Failed to parse cached balance for ${key}:`, error);
      return null;
    }
  }

  /**
   * Cache balance
   * No TTL - balances are invalidated explicitly via write-through pattern
   */
  public async setBalance(balance: CachedAgentBalance): Promise<void> {
    const key = REDIS_KEYS.BALANCE(balance.agentId, balance.walletAddress, balance.tokenAddress);
    await redisService.set(key, JSON.stringify(balance)); // No TTL - invalidated explicitly
  }

  /**
   * Invalidate balance cache
   */
  public async invalidateBalance(agentId: string, walletAddress: string, tokenAddress: string): Promise<void> {
    const key = REDIS_KEYS.BALANCE(agentId, walletAddress, tokenAddress);
    await redisService.del(key);
  }

  /**
   * Invalidate all balances for a wallet (using pattern matching - use carefully)
   * Note: Redis pattern matching (KEYS/SCAN) can be slow on large datasets. 
   * Ideally we would maintain a Set of balance keys per wallet if bulk invalidation is frequent.
   */
  public async invalidateWalletBalances(agentId: string, walletAddress: string): Promise<void> {
    // When using ioredis with keyPrefix, SCAN needs the pattern WITH prefix
    // because it matches against actual keys in Redis
    const client = redisService.getClient();
    const { redisConfig } = await import('@/config/redis.config.js');
    const prefix = redisConfig.keyPrefix || '';

    // Pattern must include prefix to match actual keys
    const pattern = `${prefix}balance:${agentId}:${walletAddress}:*`;

    // Using SCAN to find keys
    let cursor = '0';
    const keysToDelete: string[] = [];
    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    // Delete keys - ioredis with keyPrefix will handle prefix automatically for DEL
    // SCAN returns full keys (with prefix), so use a raw client to delete them
    if (keysToDelete.length > 0) {
      // Create raw Redis client without keyPrefix to delete keys directly
      const Redis = (await import('ioredis')).Redis;
      const rawClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        // No keyPrefix
      });
      await rawClient.del(...keysToDelete);
      await rawClient.quit();
    }
  }

  /**
   * Delete all balances for an agent
   * 
   * Removes all balance cache entries for all wallets belonging to the specified agent.
   * Used when an agent is deleted.
   * 
   * @param agentId - Agent ID
   */
  public async deleteAgentBalances(agentId: string): Promise<void> {
    const client = redisService.getClient();
    const { redisConfig } = await import('@/config/redis.config.js');
    const prefix = redisConfig.keyPrefix || '';

    // Pattern to match all balances for this agent (any wallet, any token)
    const pattern = `${prefix}balance:${agentId}:*`;

    // Using SCAN to find keys (more efficient than KEYS)
    let cursor = '0';
    const keysToDelete: string[] = [];
    do {
      const result = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = result[0];
      const keys = result[1];
      keysToDelete.push(...keys);
    } while (cursor !== '0');

    // Delete keys using raw client (keys include prefix from SCAN)
    if (keysToDelete.length > 0) {
      const Redis = (await import('ioredis')).Redis;
      const rawClient = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        // No keyPrefix
      });
      await rawClient.del(...keysToDelete);
      await rawClient.quit();

      console.log(`[RedisBalanceService] ✅ Deleted ${keysToDelete.length} balance(s) for agent ${agentId}`);
    }
  }
}

export const redisBalanceService = RedisBalanceService.getInstance();

