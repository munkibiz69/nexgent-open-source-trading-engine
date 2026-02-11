/**
 * Position Service Integration Tests
 * 
 * Tests position service interactions with Redis and database.
 */

// Set test Redis database BEFORE any imports
process.env.REDIS_DB = '1';

import { positionService } from '@/domain/trading/position-service.js';
import { redisPositionService } from '@/infrastructure/cache/redis-position-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { randomUUID } from 'crypto';
import { TransactionType, Prisma } from '@prisma/client';

// Mock queue client to avoid actual job processing
jest.mock('@/infrastructure/queue/queue-client.js', () => ({
  queueClient: {
    getQueue: jest.fn().mockReturnValue({
      add: jest.fn().mockResolvedValue({ id: 'job-123' }),
    }),
  },
}));

describe('PositionService Integration', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let redis: ReturnType<typeof getTestRedis>;
  let testUserId: string;
  let testAgentId: string;
  let testWalletAddress: string;

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
    
    // Create test user, agent, and wallet in a transaction to ensure atomicity
    testUserId = randomUUID();
    testAgentId = randomUUID();
    testWalletAddress = `test-wallet-${randomUUID().substring(0, 32)}`; // Unique wallet address per test (max 44 chars)

    // Use transaction to ensure all related records are created atomically
    await prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          id: testUserId,
          email: `test-${testUserId}@example.com`, // Unique email per test
          passwordHash: 'hash',
        },
      });

      await tx.agent.create({
        data: {
          id: testAgentId,
          userId: testUserId,
          name: 'Test Agent',
          tradingMode: 'simulation',
        },
      });

      await tx.agentWallet.create({
        data: {
          walletAddress: testWalletAddress,
          agentId: testAgentId,
          walletType: 'simulation',
        },
      });
    });
  });

  afterAll(async () => {
    await redisService.disconnect();
    await disconnectTestDatabase();
    await disconnectTestRedis();
  });

  describe('createPosition', () => {
    it('should create position in DB first, then cache in Redis (write-through)', async () => {
      // Arrange - Create transaction first
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

      const tokenAddress = 'So11111111111111111111111111111111111111112';
      const tokenSymbol = 'SOL';
      const purchasePrice = 100;
      const purchaseAmount = 1;

      // Act
      const position = await positionService.createPosition(
        testAgentId,
        testWalletAddress,
        transaction.id,
        tokenAddress,
        tokenSymbol,
        purchasePrice,
        purchaseAmount
      );

      // Assert - Write-Through: DB first, then Redis
      expect(position).not.toBeNull();
      expect(position.agentId).toBe(testAgentId);
      expect(position.walletAddress).toBe(testWalletAddress);
      expect(position.tokenAddress).toBe(tokenAddress);
      
      // Verify position exists in DB immediately (write-through)
      const dbPosition = await prisma.agentPosition.findUnique({
        where: { id: position.id },
      });
      expect(dbPosition).not.toBeNull();
      expect(dbPosition?.id).toBe(position.id);
      expect(dbPosition?.tokenAddress).toBe(tokenAddress);
      
      // Verify position is in Redis cache (after DB write)
      const cached = await redisPositionService.getPosition(position.id);
      expect(cached).not.toBeNull();
      expect(cached?.id).toBe(position.id);
    });
  });

  describe('loadPositions', () => {
    it('should load positions from Redis when available', async () => {
      // Arrange - Create transaction first
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

      const position = await positionService.createPosition(
        testAgentId,
        testWalletAddress,
        transaction.id,
        'So11111111111111111111111111111111111111112',
        'SOL',
        100,
        1
      );

      // Act
      const positions = await positionService.loadPositions(testAgentId, testWalletAddress);

      // Assert
      expect(positions).toHaveLength(1);
      expect(positions[0].id).toBe(position.id);
    });

    it('should fallback to database when Redis is empty', async () => {
      // Arrange - Create position directly in DB
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

      const dbPosition = await prisma.agentPosition.create({
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

      // Clear Redis to force DB fallback
      await cleanupTestRedis(redis);

      // Act
      const positions = await positionService.loadPositions(testAgentId, testWalletAddress);

      // Assert
      expect(positions).toHaveLength(1);
      expect(positions[0].id).toBe(dbPosition.id);
      
      // Verify position was cached after loading from DB
      const cached = await redisPositionService.getPosition(dbPosition.id);
      expect(cached).not.toBeNull();
    });
  });

  describe('updatePosition', () => {
    it('should update position in DB first, then cache in Redis (write-through)', async () => {
      // Arrange - Create transaction and position directly in DB first
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

      const dbPosition = await prisma.agentPosition.create({
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

      // Also cache it in Redis to match real-world scenario
      await redisPositionService.setPosition(dbPosition);

      // Act
      const updated = await positionService.updatePosition(dbPosition.id, {
        currentStopLossPercentage: -10,
        peakPrice: 150,
      });

      // Assert - Write-Through: DB first, then Redis
      expect(updated.currentStopLossPercentage).toBe(-10);
      expect(updated.peakPrice).toBe(150);
      
      // Verify update exists in DB immediately (write-through)
      const dbUpdated = await prisma.agentPosition.findUnique({
        where: { id: dbPosition.id },
      });
      expect(dbUpdated).not.toBeNull();
      expect(Number(dbUpdated?.currentStopLossPercentage)).toBe(-10);
      expect(Number(dbUpdated?.peakPrice)).toBe(150);
      
      // Verify update is in Redis cache (after DB write)
      const cached = await redisPositionService.getPosition(dbPosition.id);
      expect(cached).not.toBeNull();
      expect(Number(cached?.currentStopLossPercentage)).toBe(-10);
      expect(Number(cached?.peakPrice)).toBe(150);
    });
  });
});

