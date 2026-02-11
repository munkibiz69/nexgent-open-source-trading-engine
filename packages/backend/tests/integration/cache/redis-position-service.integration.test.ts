/**
 * Redis Position Service Integration Tests
 * 
 * Tests Redis caching operations for positions with real Redis instance.
 */

// Set test Redis database BEFORE any imports
// This ensures the redis config reads the test database number
process.env.REDIS_DB = '1';

import { RedisPositionService } from '@/infrastructure/cache/redis-position-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { createMockPosition } from '../../helpers/test-factory.js';
import type { AgentPosition } from '@prisma/client';

describe('RedisPositionService Integration', () => {
  let redisPositionService: RedisPositionService;
  let redis: ReturnType<typeof getTestRedis>;

  beforeAll(async () => {
    redis = getTestRedis();
    await connectTestRedis();
    
    // Connect the service Redis client to test database
    // The service should already be configured to use db 1 from env var above
    await redisService.connect();
    
    redisPositionService = RedisPositionService.getInstance();
  });

  beforeEach(async () => {
    // Clean up using the service's Redis client to ensure we're cleaning the same database
    const serviceClient = redisService.getClient();
    await serviceClient.flushdb();
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestRedis();
  });

  describe('setPosition and getPosition', () => {
    it('should cache and retrieve a position', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      position.createdAt = new Date();
      position.updatedAt = new Date();

      // Act
      await redisPositionService.setPosition(position);
      const retrieved = await redisPositionService.getPosition(position.id);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe(position.id);
      expect(retrieved?.agentId).toBe(position.agentId);
      expect(retrieved?.tokenAddress).toBe(position.tokenAddress);
    });

    it('should return null for non-existent position', async () => {
      // Act
      const result = await redisPositionService.getPosition('non-existent-id');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle date serialization correctly', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      const testDate = new Date('2024-01-01T00:00:00Z');
      position.createdAt = testDate;
      position.updatedAt = testDate;
      position.lastStopLossUpdate = testDate;

      // Act
      await redisPositionService.setPosition(position);
      const retrieved = await redisPositionService.getPosition(position.id);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.createdAt).toEqual(testDate);
      expect(retrieved?.updatedAt).toEqual(testDate);
      expect(retrieved?.lastStopLossUpdate).toEqual(testDate);
    });
  });

  describe('deletePosition', () => {
    it('should delete position from cache', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      position.createdAt = new Date();
      position.updatedAt = new Date();
      await redisPositionService.setPosition(position);

      // Act
      await redisPositionService.deletePosition({
        id: position.id,
        agentId: position.agentId,
        tokenAddress: position.tokenAddress,
      });
      const retrieved = await redisPositionService.getPosition(position.id);

      // Assert
      expect(retrieved).toBeNull();
    });
  });

  describe('indexes', () => {
    it('should add position to agent index', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      position.createdAt = new Date();
      position.updatedAt = new Date();

      // Act
      await redisPositionService.setPosition(position);
      const agentIds = await redisPositionService.getAgentPositionIds(position.agentId);

      // Assert
      expect(agentIds).toContain(position.id);
    });

    it('should add position to token index', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      position.createdAt = new Date();
      position.updatedAt = new Date();
      const normalizedToken = position.tokenAddress.toLowerCase();

      // Act
      await redisPositionService.setPosition(position);
      const tokenIds = await redisPositionService.getTokenPositionIds(normalizedToken);

      // Assert
      expect(tokenIds).toContain(position.id);
    });

    it('should remove position from indexes on delete', async () => {
      // Arrange
      const position = createMockPosition() as unknown as AgentPosition;
      position.createdAt = new Date();
      position.updatedAt = new Date();
      await redisPositionService.setPosition(position);

      // Act
      await redisPositionService.deletePosition({
        id: position.id,
        agentId: position.agentId,
        tokenAddress: position.tokenAddress,
      });
      const agentIds = await redisPositionService.getAgentPositionIds(position.agentId);
      const tokenIds = await redisPositionService.getTokenPositionIds(position.tokenAddress.toLowerCase());

      // Assert
      expect(agentIds).not.toContain(position.id);
      expect(tokenIds).not.toContain(position.id);
    });

    it('should handle multiple positions for same agent', async () => {
      // Arrange - Use a unique agent ID to avoid conflicts with other tests
      const agentId = `agent-${Date.now()}`;
      const position1 = createMockPosition({ agentId }) as unknown as AgentPosition;
      position1.createdAt = new Date();
      position1.updatedAt = new Date();
      const position2 = createMockPosition({ agentId }) as unknown as AgentPosition;
      position2.createdAt = new Date();
      position2.updatedAt = new Date();

      // Act
      await redisPositionService.setPosition(position1);
      await redisPositionService.setPosition(position2);
      const agentIds = await redisPositionService.getAgentPositionIds(agentId);

      // Assert
      expect(agentIds).toContain(position1.id);
      expect(agentIds).toContain(position2.id);
      expect(agentIds.length).toBe(2);
    });
  });
});

