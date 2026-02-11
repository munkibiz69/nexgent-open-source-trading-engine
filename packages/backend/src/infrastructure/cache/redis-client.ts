/**
 * Redis Client
 * 
 * Singleton Redis client using ioredis.
 * Handles connection, error handling, and provides a clean interface for cache operations.
 */

import { Redis } from 'ioredis';
import { randomUUID } from 'crypto';
import { redisConfig } from '@/config/redis.config.js';

export class RedisService {
  private static instance: RedisService;
  private client: Redis;
  private isConnected: boolean = false;

  private constructor() {
    this.client = new Redis({
      host: redisConfig.host,
      port: redisConfig.port,
      password: redisConfig.password,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
      retryStrategy: (times: number) => {
        if (times > redisConfig.maxRetries) {
          console.error(`❌ Redis: Max retries (${redisConfig.maxRetries}) reached. Connection failed.`);
          return null; // Stop retrying
        }
        const delay = Math.min(times * 500, 2000); // Exponential backoff capped at 2s
        return delay;
      },
      lazyConnect: true, // Don't connect immediately on instantiation
    });

    this.setupEventListeners();
  }

  public static getInstance(): RedisService {
    if (!RedisService.instance) {
      RedisService.instance = new RedisService();
    }
    return RedisService.instance;
  }

  private setupEventListeners() {
    this.client.on('connect', () => {
      this.isConnected = true;
      console.log('✅ Redis connected');
    });

    this.client.on('error', (err: Error) => {
      console.error('❌ Redis error:', err.message);
    });

    this.client.on('close', () => {
      this.isConnected = false;
      // Only log in non-test environments to reduce noise in tests
      if (process.env.NODE_ENV !== 'test') {
        console.warn('⚠️ Redis connection closed');
      }
    });

    this.client.on('reconnecting', () => {
      console.log('🔄 Redis reconnecting...');
    });
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (this.isConnected) return;
    try {
      await this.client.connect();
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Redis
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await this.client.quit();
  }

  /**
   * Get value by key
   */
  public async get(key: string): Promise<string | null> {
    return await this.client.get(key);
  }

  /**
   * Set value with optional expiration
   */
  public async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(key, value, 'EX', ttlSeconds);
    } else {
      await this.client.set(key, value);
    }
  }

  /**
   * Delete key
   */
  public async del(key: string): Promise<void> {
    await this.client.del(key);
  }

  /**
   * Check if key exists
   */
  public async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }

  /**
   * Get underlying ioredis client (for advanced operations)
   */
  public getClient(): Redis {
    return this.client;
  }

  /**
   * Health check
   */
  public async healthCheck(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (_error) {
      return false;
    }
  }

  /**
   * Acquire a distributed lock
   * 
   * Uses Redis SET with NX (set if not exists) and EX (expiration) for atomic lock acquisition.
   * Returns a lock token (unique identifier) on success, null if lock already exists.
   * 
   * @param key - Lock key
   * @param ttlSeconds - Time-to-live in seconds (lock auto-expires after this time)
   * @returns Lock token (unique identifier) on success, null if lock already exists
   */
  public async acquireLock(key: string, ttlSeconds: number): Promise<string | null> {
    try {
      // Generate unique lock token (UUID)
      // This ensures only the lock owner can release it
      const lockToken = randomUUID();
      
      // Use SET with NX (only set if not exists) and EX (expire after ttlSeconds)
      // Returns 'OK' if lock acquired, null if lock already exists
      const result = await this.client.set(key, lockToken, 'EX', ttlSeconds, 'NX');
      
      if (result === 'OK') {
        return lockToken;
      }
      
      // Lock already exists
      return null;
    } catch (error) {
      console.error(`Failed to acquire lock ${key}:`, error);
      // On error, assume lock acquisition failed (safe default)
      return null;
    }
  }

  /**
   * Release a distributed lock
   * 
   * Uses Lua script to atomically check lock token and delete lock.
   * Only the lock owner (with matching token) can release the lock.
   * 
   * @param key - Lock key
   * @param lockToken - Lock token returned from acquireLock()
   */
  public async releaseLock(key: string, lockToken: string): Promise<void> {
    try {
      // Lua script for atomic check-and-delete
      // Only deletes if the stored value matches the token
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("del", KEYS[1])
        else
          return 0
        end
      `;
      
      await this.client.eval(luaScript, 1, key, lockToken);
    } catch (error) {
      console.error(`Failed to release lock ${key}:`, error);
      // Don't throw - lock will expire naturally if release fails
    }
  }

  /**
   * Extend a distributed lock's expiration time
   * 
   * Uses Lua script to atomically check lock token and extend expiration.
   * Only the lock owner (with matching token) can extend the lock.
   * 
   * @param key - Lock key
   * @param lockToken - Lock token returned from acquireLock()
   * @param ttlSeconds - New time-to-live in seconds
   * @returns true if lock was extended, false if lock doesn't exist or token doesn't match
   */
  public async extendLock(key: string, lockToken: string, ttlSeconds: number): Promise<boolean> {
    try {
      // Lua script for atomic check-and-extend
      // Only extends if the stored value matches the token
      const luaScript = `
        if redis.call("get", KEYS[1]) == ARGV[1] then
          return redis.call("expire", KEYS[1], ARGV[2])
        else
          return 0
        end
      `;
      
      const result = await this.client.eval(luaScript, 1, key, lockToken, ttlSeconds.toString());
      return result === 1;
    } catch (error) {
      console.error(`Failed to extend lock ${key}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const redisService = RedisService.getInstance();

