/**
 * Queue Worker Integration Tests
 * 
 * Tests queue worker processing with real Redis and database.
 */

import { QueueWorker } from '@/infrastructure/queue/queue-worker.js';
import { queueClient } from '@/infrastructure/queue/queue-client.js';
import { QueueName, JobType } from '@/infrastructure/queue/job-types.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { getTestRedis, connectTestRedis, cleanupTestRedis, disconnectTestRedis } from '../../helpers/test-redis.js';
import { randomUUID } from 'crypto';
import { Prisma, TransactionType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Queue worker integration tests.
 * Most write operations use write-through (DB first, then Redis); async jobs (e.g. WRITE_HISTORICAL_SWAP)
 * are still processed by the worker. These tests verify queue infrastructure with real Redis.
 */
describe('QueueWorker Integration', () => {
  let prisma: ReturnType<typeof getTestPrisma>;
  let redis: ReturnType<typeof getTestRedis>;
  let queueWorker: QueueWorker;
  let testUserId: string;
  let testAgentId: string;
  let testWalletAddress: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    redis = getTestRedis();
    await connectTestRedis();
    queueWorker = QueueWorker.getInstance();
    queueWorker.initialize(); // Initialize workers to start processing jobs
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
    // Close queue workers and client to prevent open handles
    await queueWorker.closeAll();
    await queueClient.closeAll();
    await disconnectTestDatabase();
    await disconnectTestRedis();
  });

  it('should initialize queue worker successfully', () => {
    expect(queueWorker).toBeDefined();
  });

  it('should process WRITE_HISTORICAL_SWAP job and persist to database', async () => {
    const historicalSwapId = randomUUID();
    const now = new Date();
    const jobData = {
      type: JobType.WRITE_HISTORICAL_SWAP,
      data: {
        id: historicalSwapId,
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        amount: new Decimal(1),
        purchasePrice: new Decimal(100),
        salePrice: new Decimal(105),
        changePercent: new Decimal(5),
        profitLossUsd: new Decimal(5),
        profitLossSol: new Decimal(0.05),
        purchaseTime: now,
        saleTime: now,
      },
    };

    const queue = queueClient.getQueue(QueueName.DATABASE_WRITES);
    await queue.add(JobType.WRITE_HISTORICAL_SWAP, jobData);

    // Poll for record (worker processes asynchronously)
    const deadline = Date.now() + 10000;
    let record: Awaited<ReturnType<typeof prisma.agentHistoricalSwap.findUnique>> = null;
    while (Date.now() < deadline) {
      record = await prisma.agentHistoricalSwap.findUnique({
        where: { id: historicalSwapId },
      });
      if (record) break;
      await new Promise((r) => setTimeout(r, 200));
    }

    expect(record).not.toBeNull();
    expect(record?.agentId).toBe(testAgentId);
    expect(record?.tokenSymbol).toBe('SOL');
  });
});

