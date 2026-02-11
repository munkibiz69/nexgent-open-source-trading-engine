/**
 * Agent Service Integration Tests
 * 
 * Tests agent service interactions with Redis and database, including cache synchronization.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { agentService } from '@/domain/agents/agent-service.js';
import { redisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisAgentService } from '@/infrastructure/cache/redis-agent-service.js';
import { redisPositionService } from '@/infrastructure/cache/redis-position-service.js';
import { redisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { randomUUID } from 'crypto';

describe('AgentService Integration', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let redis: ReturnType<typeof getTestRedis>;
  let testUserId: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    redis = getTestRedis();
    await connectTestRedis();
    
    // Connect the service Redis client to test database
    await redisService.connect();
  });

  beforeEach(async () => {
    // Clean up first
    await cleanupTestDatabase(prisma);
    await cleanupTestRedis(redis);
    
    // Create test user
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`,
        passwordHash: 'hash',
      },
    });
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestDatabase();
    await disconnectTestRedis();
  });

  describe('createAgent', () => {
    it('should create agent in DB and sync cache (write-through)', async () => {
      // Act
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Assert - Database
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(dbAgent).toBeTruthy();
      expect(dbAgent?.name).toBe('Test Agent');
      expect(dbAgent?.tradingMode).toBe('simulation');

      // Assert - Wallet created
      const wallet = await prisma.agentWallet.findFirst({
        where: { agentId: agent.id },
      });
      expect(wallet).toBeTruthy();
      expect(wallet?.walletType).toBe('simulation');

      // Assert - Cache synced
      const cachedConfig = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfig).toBeTruthy();
      expect(cachedConfig?.signals).toBeDefined();

      const activeAgents = await redisAgentService.getActiveAgentIds();
      expect(activeAgents).toContain(agent.id);
    });

    it('should create agent with live trading mode', async () => {
      // Act
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Live Agent',
        tradingMode: 'live',
      });

      // Assert
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(dbAgent?.tradingMode).toBe('live');
    });

    it('should default to simulation mode when not specified', async () => {
      // Act
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Default Agent',
      });

      // Assert
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(dbAgent?.tradingMode).toBe('simulation');
    });
  });

  describe('updateAgent', () => {
    it('should update agent and invalidate cache when tradingMode changes', async () => {
      // Arrange - Create agent
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Verify cache exists
      const cachedConfigBefore = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigBefore).toBeTruthy();

      // Act - Update trading mode
      const updatedAgent = await agentService.updateAgent(agent.id, {
        tradingMode: 'live',
      });

      // Assert - Database updated
      expect(updatedAgent.tradingMode).toBe('live');

      // Assert - Cache invalidated (should not exist)
      const cachedConfigAfter = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigAfter).toBeNull();
    });

    it('should update name without invalidating cache', async () => {
      // Arrange
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
      });

      const cachedConfigBefore = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigBefore).toBeTruthy();

      // Act
      const updatedAgent = await agentService.updateAgent(agent.id, {
        name: 'Updated Name',
      });

      // Assert
      expect(updatedAgent.name).toBe('Updated Name');
      
      // Cache should still exist (not invalidated)
      const cachedConfigAfter = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigAfter).toBeTruthy();
    });

    it('should throw error when agent not found', async () => {
      // Act & Assert
      await expect(
        agentService.updateAgent(randomUUID(), { name: 'New Name' })
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('deleteAgent', () => {
    it('should delete agent and cleanup all cache entries', async () => {
      // Arrange - Create agent with positions and balances
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
      });

      const wallet = await prisma.agentWallet.findFirst({
        where: { agentId: agent.id },
      });
      expect(wallet).toBeTruthy();

      // Create some test data
      await prisma.agentBalance.create({
        data: {
          agent: { connect: { id: agent.id } },
          wallet: { connect: { walletAddress: wallet!.walletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          balance: '10.0',
        },
      });

      // Verify cache exists
      const cachedConfig = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfig).toBeTruthy();

      const activeAgents = await redisAgentService.getActiveAgentIds();
      expect(activeAgents).toContain(agent.id);

      // Act
      await agentService.deleteAgent(agent.id);

      // Assert - Database deleted
      const dbAgent = await prisma.agent.findUnique({
        where: { id: agent.id },
      });
      expect(dbAgent).toBeNull();

      // Assert - Related data cascade deleted
      const dbWallet = await prisma.agentWallet.findUnique({
        where: { walletAddress: wallet!.walletAddress },
      });
      expect(dbWallet).toBeNull();

      // Assert - Cache cleaned up
      const cachedConfigAfter = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigAfter).toBeNull();

      const activeAgentsAfter = await redisAgentService.getActiveAgentIds();
      expect(activeAgentsAfter).not.toContain(agent.id);
    });

    it('should throw error when agent not found', async () => {
      // Act & Assert
      await expect(
        agentService.deleteAgent(randomUUID())
      ).rejects.toThrow('Agent not found');
    });
  });

  describe('updateAgentConfig', () => {
    it('should update config and invalidate cache', async () => {
      // Arrange
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
      });

      const cachedConfigBefore = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigBefore).toBeTruthy();

      // Act
      const newConfig = {
        ...cachedConfigBefore!,
        signals: {
          ...cachedConfigBefore!.signals,
          minScore: 5,
        },
      };

      const updatedConfig = await agentService.updateAgentConfig(agent.id, newConfig);

      // Assert
      expect(updatedConfig.signals.minScore).toBe(5);

      // Config should be reloaded and cached
      const cachedConfigAfter = await redisConfigService.getAgentConfig(agent.id);
      expect(cachedConfigAfter).toBeTruthy();
      expect(cachedConfigAfter?.signals.minScore).toBe(5);
    });

    it('should reset config to defaults when null', async () => {
      // Arrange
      const agent = await agentService.createAgent({
        userId: testUserId,
        name: 'Test Agent',
      });

      // Act
      const updatedConfig = await agentService.updateAgentConfig(agent.id, null);

      // Assert
      expect(updatedConfig).toBeTruthy();
      expect(updatedConfig.signals).toBeDefined();
    });

    it('should throw error when agent not found', async () => {
      // Act & Assert
      await expect(
        agentService.updateAgentConfig(randomUUID(), null)
      ).rejects.toThrow('Agent not found');
    });
  });
});

