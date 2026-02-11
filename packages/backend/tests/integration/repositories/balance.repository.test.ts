/**
 * Balance Repository Integration Tests
 * 
 * Tests database operations for balances with real database.
 */

import { BalanceRepository } from '@/infrastructure/database/repositories/balance.repository.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

describe('BalanceRepository Integration', () => {
  let repository: BalanceRepository;
  let prisma: ReturnType<typeof getTestPrisma>;
  let testUserId: string;
  let testAgentId: string;
  let testWalletAddress: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    repository = new BalanceRepository();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
    
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
    await disconnectTestDatabase();
  });

  describe('upsert', () => {
    it('should create a new balance', async () => {
      // Act
      const balance = await repository.upsert(
        testWalletAddress,
        testAgentId,
        'So11111111111111111111111111111111111111112',
        'SOL',
        '1000000000' // 1 SOL in lamports
      );

      // Assert
      expect(balance).not.toBeNull();
      expect(balance.walletAddress).toBe(testWalletAddress);
      expect(balance.agentId).toBe(testAgentId);
      expect(balance.tokenAddress).toBe('So11111111111111111111111111111111111111112');
      expect(balance.balance).toBe('1000000000');
    });

    it('should update existing balance', async () => {
      // Arrange
      await repository.upsert(
        testWalletAddress,
        testAgentId,
        'So11111111111111111111111111111111111111112',
        'SOL',
        '1000000000'
      );

      // Act
      const updated = await repository.upsert(
        testWalletAddress,
        testAgentId,
        'So11111111111111111111111111111111111111112',
        'SOL',
        '2000000000' // 2 SOL
      );

      // Assert
      expect(updated.balance).toBe('2000000000');
    });
  });

  describe('findByWalletAddressAndTokenAddress', () => {
    it('should find balance by wallet and token', async () => {
      // Arrange
      const balance = await repository.upsert(
        testWalletAddress,
        testAgentId,
        'So11111111111111111111111111111111111111112',
        'SOL',
        '1000000000'
      );

      // Act
      const found = await repository.findByWalletAddressAndTokenAddress(
        testWalletAddress,
        'So11111111111111111111111111111111111111112'
      );

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(balance.id);
      expect(found?.balance).toBe('1000000000');
    });

    it('should return null for non-existent balance', async () => {
      // Act
      const found = await repository.findByWalletAddressAndTokenAddress(
        testWalletAddress,
        'non-existent-token'
      );

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('create', () => {
    it('should create a balance', async () => {
      // Act
      const balance = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000',
      });

      // Assert
      expect(balance).not.toBeNull();
      expect(balance.walletAddress).toBe(testWalletAddress);
    });
  });

  describe('update', () => {
    it('should update balance', async () => {
      // Arrange
      const balance = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        balance: '1000000000',
      });

      // Act
      const updated = await repository.update(balance.id, {
        balance: '2000000000',
      });

      // Assert
      expect(updated.balance).toBe('2000000000');
    });
  });

  describe('lockRow', () => {
    it('should lock a row for update', async () => {
      // Arrange
      await repository.upsert(
        testWalletAddress,
        testAgentId,
        'So11111111111111111111111111111111111111112',
        'SOL',
        '1000000000'
      );

      // Act & Assert - Should not throw
      await prisma.$transaction(async (tx) => {
        await repository.lockRow(
          testWalletAddress,
          'So11111111111111111111111111111111111111112',
          tx
        );
        // Lock should succeed
      });
    });
  });
});

