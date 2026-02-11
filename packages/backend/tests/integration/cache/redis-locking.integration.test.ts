/**
 * Redis Distributed Locking Integration Tests
 * 
 * Tests distributed locking functionality with real Redis instance.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestRedis, connectTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';

describe('RedisService Distributed Locking', () => {
  let redis: ReturnType<typeof getTestRedis>;

  beforeAll(async () => {
    redis = getTestRedis();
    await connectTestRedis();
    await redisService.connect();
  });

  beforeEach(async () => {
    // Clean up test data
    const serviceClient = redisService.getClient();
    await serviceClient.flushdb();
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestRedis();
  });

  describe('acquireLock', () => {
    it('should acquire a lock successfully', async () => {
      // Arrange
      const lockKey = 'test-lock-1';
      const ttlSeconds = 10;

      // Act
      const lockToken = await redisService.acquireLock(lockKey, ttlSeconds);

      // Assert
      expect(lockToken).toBeTruthy();
      expect(typeof lockToken).toBe('string');
      expect(lockToken).not.toBeNull();
      expect(lockToken!.length).toBeGreaterThan(0);

      // Verify lock exists in Redis
      const exists = await redisService.exists(lockKey);
      expect(exists).toBe(true);

      // Verify lock has TTL
      const serviceClient = redisService.getClient();
      const ttl = await serviceClient.ttl(lockKey);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);
    });

    it('should return null if lock already exists', async () => {
      // Arrange
      const lockKey = 'test-lock-2';
      const ttlSeconds = 10;

      // Act - acquire lock first time
      const firstLock = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(firstLock).toBeTruthy();

      // Try to acquire same lock again
      const secondLock = await redisService.acquireLock(lockKey, ttlSeconds);

      // Assert
      expect(secondLock).toBeNull();
    });

    it('should generate unique lock tokens', async () => {
      // Arrange
      const lockKey1 = 'test-lock-3';
      const lockKey2 = 'test-lock-4';
      const ttlSeconds = 10;

      // Act
      const token1 = await redisService.acquireLock(lockKey1, ttlSeconds);
      const token2 = await redisService.acquireLock(lockKey2, ttlSeconds);

      // Assert
      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
    });

    it('should allow acquiring different locks concurrently', async () => {
      // Arrange
      const lockKeys = ['test-lock-5', 'test-lock-6', 'test-lock-7'];
      const ttlSeconds = 10;

      // Act - acquire all locks in parallel
      const locks = await Promise.all(
        lockKeys.map(key => redisService.acquireLock(key, ttlSeconds))
      );

      // Assert
      locks.forEach(lock => {
        expect(lock).toBeTruthy();
      });
    });
  });

  describe('releaseLock', () => {
    it('should release a lock successfully', async () => {
      // Arrange
      const lockKey = 'test-lock-release-1';
      const ttlSeconds = 10;
      const lockToken = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(lockToken).toBeTruthy();

      // Verify lock exists
      let exists = await redisService.exists(lockKey);
      expect(exists).toBe(true);

      // Act
      await redisService.releaseLock(lockKey, lockToken!);

      // Assert
      exists = await redisService.exists(lockKey);
      expect(exists).toBe(false);
    });

    it('should not release lock with wrong token', async () => {
      // Arrange
      const lockKey = 'test-lock-release-2';
      const ttlSeconds = 10;
      const correctToken = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(correctToken).toBeTruthy();

      // Act - try to release with wrong token
      const wrongToken = 'wrong-token-12345';
      await redisService.releaseLock(lockKey, wrongToken);

      // Assert - lock should still exist
      const exists = await redisService.exists(lockKey);
      expect(exists).toBe(true);

      // Cleanup
      await redisService.releaseLock(lockKey, correctToken!);
    });

    it('should allow acquiring lock again after release', async () => {
      // Arrange
      const lockKey = 'test-lock-release-3';
      const ttlSeconds = 10;

      // Act - acquire, release, acquire again
      const firstLock = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(firstLock).toBeTruthy();

      await redisService.releaseLock(lockKey, firstLock!);

      const secondLock = await redisService.acquireLock(lockKey, ttlSeconds);

      // Assert
      expect(secondLock).toBeTruthy();
      expect(secondLock).not.toBe(firstLock); // Should have different token
    });
  });

  describe('extendLock', () => {
    it('should extend lock expiration successfully', async () => {
      // Arrange
      const lockKey = 'test-lock-extend-1';
      const initialTtl = 5;
      const extendedTtl = 10;
      const lockToken = await redisService.acquireLock(lockKey, initialTtl);
      expect(lockToken).toBeTruthy();

      // Wait a bit to ensure some time passed
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      const extended = await redisService.extendLock(lockKey, lockToken!, extendedTtl);

      // Assert
      expect(extended).toBe(true);

      // Verify TTL was extended
      const serviceClient = redisService.getClient();
      const ttl = await serviceClient.ttl(lockKey);
      expect(ttl).toBeGreaterThan(initialTtl - 1); // Should be close to extendedTtl
      expect(ttl).toBeLessThanOrEqual(extendedTtl);
    });

    it('should not extend lock with wrong token', async () => {
      // Arrange
      const lockKey = 'test-lock-extend-2';
      const ttlSeconds = 10;
      const correctToken = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(correctToken).toBeTruthy();

      // Act - try to extend with wrong token
      const wrongToken = 'wrong-token-12345';
      const extended = await redisService.extendLock(lockKey, wrongToken, 20);

      // Assert
      expect(extended).toBe(false);

      // Verify TTL was not changed
      const serviceClient = redisService.getClient();
      const ttl = await serviceClient.ttl(lockKey);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);

      // Cleanup
      await redisService.releaseLock(lockKey, correctToken!);
    });

    it('should not extend lock that does not exist', async () => {
      // Arrange
      const lockKey = 'test-lock-extend-3';
      const fakeToken = 'fake-token-12345';

      // Act
      const extended = await redisService.extendLock(lockKey, fakeToken, 10);

      // Assert
      expect(extended).toBe(false);
    });
  });

  describe('lock expiration', () => {
    it('should automatically release lock after TTL expires', async () => {
      // Arrange
      const lockKey = 'test-lock-expire-1';
      const ttlSeconds = 1; // Very short TTL for testing

      // Act - acquire lock
      const lockToken = await redisService.acquireLock(lockKey, ttlSeconds);
      expect(lockToken).toBeTruthy();

      // Verify lock exists
      let exists = await redisService.exists(lockKey);
      expect(exists).toBe(true);

      // Poll until TTL expires (avoids flaky fixed sleep; max wait 5s)
      const deadline = Date.now() + 5000;
      while (Date.now() < deadline) {
        exists = await redisService.exists(lockKey);
        if (!exists) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      // Assert - lock should be gone
      expect(exists).toBe(false);

      // Should be able to acquire lock again
      const newLock = await redisService.acquireLock(lockKey, 10);
      expect(newLock).toBeTruthy();
    });
  });

  describe('concurrent lock acquisition', () => {
    it('should prevent concurrent acquisition of same lock', async () => {
      // Arrange
      const lockKey = 'test-lock-concurrent-1';
      const ttlSeconds = 5;
      const concurrentAttempts = 10;

      // Act - try to acquire same lock concurrently
      const results = await Promise.all(
        Array.from({ length: concurrentAttempts }, () =>
          redisService.acquireLock(lockKey, ttlSeconds)
        )
      );

      // Assert - only one should succeed
      const successful = results.filter(r => r !== null);
      expect(successful.length).toBe(1);
    });
  });
});

