/**
 * Idempotency Service Integration Tests
 * 
 * Tests idempotency checks with real Redis instance.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { idempotencyService } from '@/infrastructure/cache/idempotency-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestRedis, connectTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';

describe('IdempotencyService Integration', () => {
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

  describe('checkAndSet', () => {
    it('should return true for first operation', async () => {
      // Arrange
      const operationKey = 'sale:position-123';
      const ttlSeconds = 60;

      // Act
      const canProceed = await idempotencyService.checkAndSet(operationKey, ttlSeconds);

      // Assert
      expect(canProceed).toBe(true);
    });

    it('should return false for duplicate operation', async () => {
      // Arrange
      const operationKey = 'sale:position-456';
      const ttlSeconds = 60;

      // Act - first operation
      const firstCheck = await idempotencyService.checkAndSet(operationKey, ttlSeconds);
      expect(firstCheck).toBe(true);

      // Second operation (duplicate)
      const secondCheck = await idempotencyService.checkAndSet(operationKey, ttlSeconds);

      // Assert
      expect(secondCheck).toBe(false);
    });

    it('should allow different operations concurrently', async () => {
      // Arrange
      const operationKeys = [
        'sale:position-111',
        'sale:position-222',
        'sale:position-333',
      ];
      const ttlSeconds = 60;

      // Act - check all operations
      const results = await Promise.all(
        operationKeys.map(key => idempotencyService.checkAndSet(key, ttlSeconds))
      );

      // Assert - all should succeed
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should set TTL on idempotency key', async () => {
      // Arrange
      const operationKey = 'sale:position-ttl-test';
      const ttlSeconds = 10;

      // Act
      await idempotencyService.checkAndSet(operationKey, ttlSeconds);

      // Assert - verify TTL is set
      const serviceClient = redisService.getClient();
      const ttl = await serviceClient.ttl(`idempotency:${operationKey}`);
      expect(ttl).toBeGreaterThan(0);
      expect(ttl).toBeLessThanOrEqual(ttlSeconds);
    });
  });

  describe('clear', () => {
    it('should clear idempotency key', async () => {
      // Arrange
      const operationKey = 'sale:position-clear-1';
      const ttlSeconds = 60;

      // Set idempotency key
      const canProceed = await idempotencyService.checkAndSet(operationKey, ttlSeconds);
      expect(canProceed).toBe(true);

      // Verify it exists
      const isInProgress = await idempotencyService.isInProgress(operationKey);
      expect(isInProgress).toBe(true);

      // Act
      await idempotencyService.clear(operationKey);

      // Assert
      const isStillInProgress = await idempotencyService.isInProgress(operationKey);
      expect(isStillInProgress).toBe(false);
    });

    it('should allow operation to proceed again after clear', async () => {
      // Arrange
      const operationKey = 'sale:position-clear-2';
      const ttlSeconds = 60;

      // Set and clear
      await idempotencyService.checkAndSet(operationKey, ttlSeconds);
      await idempotencyService.clear(operationKey);

      // Act - try again
      const canProceed = await idempotencyService.checkAndSet(operationKey, ttlSeconds);

      // Assert
      expect(canProceed).toBe(true);
    });

    it('should handle clearing non-existent key gracefully', async () => {
      // Arrange
      const operationKey = 'sale:position-nonexistent';

      // Act - should not throw
      await expect(
        idempotencyService.clear(operationKey)
      ).resolves.not.toThrow();
    });
  });

  describe('isInProgress', () => {
    it('should return true for operation in progress', async () => {
      // Arrange
      const operationKey = 'sale:position-inprogress-1';
      const ttlSeconds = 60;

      // Set idempotency key
      await idempotencyService.checkAndSet(operationKey, ttlSeconds);

      // Act
      const isInProgress = await idempotencyService.isInProgress(operationKey);

      // Assert
      expect(isInProgress).toBe(true);
    });

    it('should return false for operation not in progress', async () => {
      // Arrange
      const operationKey = 'sale:position-notinprogress-1';

      // Act
      const isInProgress = await idempotencyService.isInProgress(operationKey);

      // Assert
      expect(isInProgress).toBe(false);
    });

    it('should return false after clear', async () => {
      // Arrange
      const operationKey = 'sale:position-cleared-1';
      const ttlSeconds = 60;

      // Set and clear
      await idempotencyService.checkAndSet(operationKey, ttlSeconds);
      await idempotencyService.clear(operationKey);

      // Act
      const isInProgress = await idempotencyService.isInProgress(operationKey);

      // Assert
      expect(isInProgress).toBe(false);
    });
  });

  describe('automatic expiration', () => {
    it('should allow operation after TTL expires', async () => {
      // Arrange
      const operationKey = 'sale:position-expire-1';
      const ttlSeconds = 1; // Very short TTL for testing

      // Set idempotency key
      const firstCheck = await idempotencyService.checkAndSet(operationKey, ttlSeconds);
      expect(firstCheck).toBe(true);

      // Poll until TTL expires (avoids flaky fixed sleep; max wait 5s)
      const deadline = Date.now() + 5000;
      let secondCheck = false;
      while (Date.now() < deadline) {
        secondCheck = await idempotencyService.checkAndSet(operationKey, ttlSeconds);
        if (secondCheck) break;
        await new Promise((r) => setTimeout(r, 100));
      }

      // Assert - should be able to proceed again after expiry
      expect(secondCheck).toBe(true);
    });
  });

  describe('concurrent operations', () => {
    it('should prevent concurrent duplicate operations', async () => {
      // Arrange
      const operationKey = 'sale:position-concurrent-1';
      const ttlSeconds = 5;
      const concurrentAttempts = 10;

      // Act - try same operation concurrently
      const results = await Promise.all(
        Array.from({ length: concurrentAttempts }, () =>
          idempotencyService.checkAndSet(operationKey, ttlSeconds)
        )
      );

      // Assert - only one should succeed
      const successful = results.filter(r => r === true);
      expect(successful.length).toBe(1);
    });
  });
});

