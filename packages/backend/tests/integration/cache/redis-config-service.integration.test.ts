/**
 * Redis Config Service Integration Tests
 * 
 * Tests Redis caching operations for agent configurations with real Redis instance.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { RedisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { createMockConfig } from '../../helpers/test-factory.js';
import type { AgentTradingConfig } from '@nexgent/shared';

describe('RedisConfigService Integration', () => {
  let redisConfigService: RedisConfigService;
  let redis: ReturnType<typeof getTestRedis>;

  beforeAll(async () => {
    redis = getTestRedis();
    await connectTestRedis();
    
    // Connect the service Redis client to test database
    await redisService.connect();
    
    redisConfigService = RedisConfigService.getInstance();
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

  describe('setAgentConfig and getAgentConfig', () => {
    it('should cache and retrieve an agent config', async () => {
      // Arrange
      const agentId = 'agent-123';
      const config = createMockConfig();

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved).toEqual(config);
      expect(retrieved?.signals.minScore).toBe(config.signals.minScore);
      expect(retrieved?.stopLoss.enabled).toBe(config.stopLoss.enabled);
    });

    it('should return null for non-existent config', async () => {
      // Act
      const result = await redisConfigService.getAgentConfig('non-existent-agent');

      // Assert
      expect(result).toBeNull();
    });

    it('should handle complex nested config structures', async () => {
      // Arrange
      const agentId = 'agent-123';
      const config: AgentTradingConfig = createMockConfig({
        stopLoss: {
          enabled: true,
          defaultPercentage: -20,
          mode: 'custom' as const,
          trailingLevels: [
            { change: 50, stopLoss: 90 },
            { change: 100, stopLoss: 95 },
          ],
        },
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.stopLoss.trailingLevels).toHaveLength(2);
      expect(retrieved?.stopLoss.mode).toBe('custom');
    });
  });

  describe('invalidateAgentConfig', () => {
    it('should remove config from cache', async () => {
      // Arrange
      const agentId = 'agent-123';
      const config = createMockConfig();
      await redisConfigService.setAgentConfig(agentId, config);

      // Act
      await redisConfigService.invalidateAgentConfig(agentId);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved).toBeNull();
    });
  });

  describe('config updates', () => {
    it('should update existing config in cache', async () => {
      // Arrange
      const agentId = 'agent-123';
      const config1 = createMockConfig({ 
        signals: { 
          minScore: 1,
          allowedSignalTypes: [],
          tokenFilterMode: 'none' as const,
          tokenList: [],
        } 
      });
      const config2 = createMockConfig({ 
        signals: { 
          minScore: 5,
          allowedSignalTypes: [],
          tokenFilterMode: 'none' as const,
          tokenList: [],
        } 
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config1);
      await redisConfigService.setAgentConfig(agentId, config2);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.signals.minScore).toBe(5);
    });
  });

  // ===========================================
  // Take-Profit Configuration Tests
  // ===========================================
  describe('Take-Profit Config', () => {
    it('should cache and retrieve take-profit configuration', async () => {
      // Arrange
      const agentId = 'agent-tp-123';
      const config: AgentTradingConfig = createMockConfig({
        takeProfit: {
          enabled: true,
          mode: 'custom' as const,
          levels: [
            { targetPercent: 50, sellPercent: 25 },
            { targetPercent: 150, sellPercent: 25 },
            { targetPercent: 300, sellPercent: 25 },
            { targetPercent: 400, sellPercent: 15 },
          ],
          moonBag: {
            enabled: true,
            triggerPercent: 300,
            retainPercent: 10,
          },
        },
        dca: {
          enabled: false,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved).not.toBeNull();
      expect(retrieved?.takeProfit?.enabled).toBe(true);
      expect(retrieved?.takeProfit?.levels).toHaveLength(4);
      expect(retrieved?.takeProfit?.levels[0].targetPercent).toBe(50);
      expect(retrieved?.takeProfit?.levels[0].sellPercent).toBe(25);
      expect(retrieved?.takeProfit?.moonBag?.enabled).toBe(true);
      expect(retrieved?.takeProfit?.moonBag?.triggerPercent).toBe(300);
      expect(retrieved?.takeProfit?.moonBag?.retainPercent).toBe(10);
    });

    it('should preserve take-profit mode in cache', async () => {
      // Arrange
      const agentId = 'agent-tp-mode';
      const config: AgentTradingConfig = createMockConfig({
        takeProfit: {
          enabled: true,
          mode: 'aggressive' as const,
          levels: [
            { targetPercent: 25, sellPercent: 20 },
            { targetPercent: 50, sellPercent: 25 },
          ],
          moonBag: {
            enabled: false,
            triggerPercent: 100,
            retainPercent: 5,
          },
        },
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved?.takeProfit?.mode).toBe('aggressive');
    });

    it('should handle config with DCA disabled and take-profit enabled', async () => {
      // Arrange
      const agentId = 'agent-tp-only';
      const config: AgentTradingConfig = createMockConfig({
        dca: {
          enabled: false,
          mode: 'moderate' as const,
          levels: [],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
        takeProfit: {
          enabled: true,
          mode: 'moderate' as const,
          levels: [
            { targetPercent: 50, sellPercent: 25 },
            { targetPercent: 150, sellPercent: 25 },
          ],
          moonBag: {
            enabled: true,
            triggerPercent: 150,
            retainPercent: 10,
          },
        },
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved?.dca?.enabled).toBe(false);
      expect(retrieved?.takeProfit?.enabled).toBe(true);
    });

    it('should handle config with take-profit disabled and DCA enabled', async () => {
      // Arrange
      const agentId = 'agent-dca-only';
      const config: AgentTradingConfig = createMockConfig({
        dca: {
          enabled: true,
          mode: 'aggressive' as const,
          levels: [
            { dropPercent: -10, buyPercent: 100 },
            { dropPercent: -20, buyPercent: 100 },
          ],
          maxDCACount: 3,
          cooldownSeconds: 30,
        },
        takeProfit: {
          enabled: false,
          mode: 'moderate' as const,
          levels: [],
          moonBag: {
            enabled: false,
            triggerPercent: 300,
            retainPercent: 10,
          },
        },
      });

      // Act
      await redisConfigService.setAgentConfig(agentId, config);
      const retrieved = await redisConfigService.getAgentConfig(agentId);

      // Assert
      expect(retrieved?.dca?.enabled).toBe(true);
      expect(retrieved?.takeProfit?.enabled).toBe(false);
    });
  });
});

