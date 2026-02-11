/**
 * Test Redis Utilities
 * 
 * Provides utilities for setting up and cleaning up test Redis connections.
 * Uses a separate Redis database (db 1) for tests to avoid affecting development data.
 */

import { Redis } from 'ioredis';
import type { RedisOptions } from 'ioredis';

let testRedis: Redis | null = null;

/**
 * Get or create a test Redis client
 * 
 * Uses a separate Redis database (db 1) for tests, or a test Redis URL if provided.
 * 
 * @returns Redis client instance for testing
 */
export function getTestRedis(): Redis {
  if (!testRedis) {
    const testRedisUrl = process.env.REDIS_TEST_URL || process.env.REDIS_URL;
    
    const options: RedisOptions = {
      db: 1, // Use db 1 for tests (separate from dev db 0)
      lazyConnect: true,
    };

    if (testRedisUrl) {
      // Parse Redis URL if provided
      const url = new URL(testRedisUrl);
      options.host = url.hostname;
      options.port = parseInt(url.port || '6379', 10);
      if (url.password) {
        options.password = url.password;
      }
      // Extract db from pathname if present (redis://localhost:6379/1)
      const dbMatch = url.pathname?.match(/^\/(\d+)$/);
      if (dbMatch) {
        options.db = parseInt(dbMatch[1], 10);
      }
    } else {
      // Use defaults
      options.host = 'localhost';
      options.port = 6379;
    }

    testRedis = new Redis(options);
  }

  return testRedis;
}

/**
 * Connect to test Redis
 */
export async function connectTestRedis(): Promise<void> {
  const redis = getTestRedis();
  if (!redis.status || redis.status === 'end') {
    await redis.connect();
  }
}

/**
 * Clean up all test data from Redis
 * 
 * Flushes the test database (db 1) to remove all test data.
 * 
 * @param redis - Redis client instance
 */
export async function cleanupTestRedis(redis: Redis): Promise<void> {
  await redis.flushdb();
}

/**
 * Disconnect from test Redis
 */
export async function disconnectTestRedis(): Promise<void> {
  if (testRedis) {
    await testRedis.quit();
    testRedis = null;
  }
}

