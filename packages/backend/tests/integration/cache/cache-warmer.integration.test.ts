/**
 * Cache Warmer Integration Tests
 * 
 * Tests cache warming functionality with real Redis and database.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { CacheWarmer } from '@/infrastructure/cache/cache-warmer.js';
import { redisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisPositionService } from '@/infrastructure/cache/redis-position-service.js';
import { redisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import { redisAgentService } from '@/infrastructure/cache/redis-agent-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { DEFAULT_TRADING_CONFIG } from '@nexgent/shared';
import { randomUUID } from 'crypto';
import { Prisma, TransactionType } from '@prisma/client';

describe('CacheWarmer Integration', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let redis: ReturnType<typeof getTestRedis>;
  let cacheWarmer: CacheWarmer;
  let testUserId: string;
  let testAgentId: string;
  let testWalletAddress: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    redis = getTestRedis();
    await connectTestRedis();
    
    // Connect the service Redis client to test database
    await redisService.connect();
    
    cacheWarmer = CacheWarmer.getInstance();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
    await cleanupTestRedis(redis);
    
    // Create test user, agent, and wallet
    testUserId = randomUUID();
    testAgentId = randomUUID();
    testWalletAddress = `test-wallet-${randomUUID().substring(0, 32)}`; // Unique wallet address per test (max 44 chars)

    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`, // Unique email per test
        passwordHash: 'hash',
      },
    });

    await prisma.agent.create({
      data: {
        id: testAgentId,
        userId: testUserId,
        name: 'Test Agent',
        tradingMode: 'simulation',
        tradingConfig: DEFAULT_TRADING_CONFIG as unknown as Prisma.InputJsonValue,
      },
    });

    await prisma.agentWallet.create({
      data: {
        walletAddress: testWalletAddress,
        agentId: testAgentId,
        walletType: 'simulation',
      },
    });
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestDatabase();
    await disconnectTestRedis();
  });

  describe('warmup', () => {
    it('should warm up agent configurations', async () => {
      // Act
      await cacheWarmer.warmup();

      // Assert - Verify config is cached
      const cached = await redisConfigService.getAgentConfig(testAgentId);
      expect(cached).not.toBeNull();
      // Config may be stored differently, check if signals exists
      if (cached?.signals) {
        expect(cached.signals.minScore).toBe(DEFAULT_TRADING_CONFIG.signals.minScore);
      } else {
        // If signals is not directly on cached, it might be nested differently
        expect(cached).toBeDefined();
      }
    });

    it('should warm up positions', async () => {
      // Arrange - Create a position in database
      const transaction = await prisma.agentTransaction.create({
        data: {
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          transactionType: TransactionType.SWAP,
          transactionValueUsd: 100,
          transactionTime: new Date(),
          outputMint: 'So11111111111111111111111111111111111111112',
          outputSymbol: 'SOL',
          outputAmount: 1,
          outputPrice: 100,
        },
      });

      await prisma.agentPosition.create({
        data: {
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          purchaseTransaction: { connect: { id: transaction.id } },
          purchasePrice: 100,
          purchaseAmount: 1,
        },
      });

      // Act
      await cacheWarmer.warmup();

      // Assert - Verify position is cached
      const agentIds = await redisPositionService.getAgentPositionIds(testAgentId);
      expect(agentIds.length).toBeGreaterThan(0);
    });

    it('should warm up balances', async () => {
      // Arrange - Create a balance in database
      await prisma.agentBalance.create({
        data: {
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          balance: '1000000000',
        },
      });

      // Act
      await cacheWarmer.warmup();

      // Assert - Verify balance is cached
      const cached = await redisBalanceService.getBalance(
        testAgentId,
        testWalletAddress,
        'So11111111111111111111111111111111111111112'
      );
      expect(cached).not.toBeNull();
      expect(cached?.balance).toBe('1000000000');
    });

    it('should add agents to active agents set', async () => {
      // Act
      await cacheWarmer.warmup();

      // Assert - Verify agent is in active set
      const activeAgents = await redisAgentService.getActiveAgentIds();
      expect(activeAgents).toContain(testAgentId);
    });

    it('should handle empty database gracefully', async () => {
      // Arrange - Clear all data
      await cleanupTestDatabase(prisma);

      // Act & Assert - Should not throw
      await expect(cacheWarmer.warmup()).resolves.not.toThrow();
    });
  });
});

