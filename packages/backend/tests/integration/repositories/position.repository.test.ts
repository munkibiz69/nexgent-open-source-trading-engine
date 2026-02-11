/**
 * Position Repository Integration Tests
 * 
 * Tests database operations for positions with real database.
 */

import { PositionRepository } from '@/infrastructure/database/repositories/position.repository.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { createMockAgentId, createMockWalletAddress } from '../../helpers/test-factory.js';
import { randomUUID } from 'crypto';
import { TransactionType, Prisma } from '@prisma/client';

describe('PositionRepository Integration', () => {
  let repository: PositionRepository;
  let prisma: ReturnType<typeof getTestPrisma>;
  let testUserId: string;
  let testAgentId: string;
  let testWalletAddress: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    repository = new PositionRepository();
  });

  beforeEach(async () => {
    // Clean up first
    await cleanupTestDatabase(prisma);
    
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
    await disconnectTestDatabase();
  });

  describe('create', () => {
    it('should create a position', async () => {
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

      const positionData = {
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        purchaseTransaction: { connect: { id: transaction.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      };

      // Act
      const position = await repository.create(positionData);

      // Assert
      expect(position).not.toBeNull();
      expect(position.id).toBeDefined();
      expect(position.agentId).toBe(testAgentId);
      expect(position.walletAddress).toBe(testWalletAddress);
      expect(position.tokenAddress).toBe(positionData.tokenAddress);
    });
  });

  describe('findById', () => {
    it('should find position by id', async () => {
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

      const position = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        purchaseTransaction: { connect: { id: transaction.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      });

      // Act
      const found = await repository.findById(position.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(position.id);
    });

    it('should return null for non-existent position', async () => {
      // Act - Use a valid UUID format
      const found = await repository.findById(randomUUID());

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findByAgentId', () => {
    it('should find all positions for an agent', async () => {
      // Arrange - Create transactions first
      const transaction1 = await prisma.agentTransaction.create({
        data: {
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          transactionType: TransactionType.SWAP,
          transactionValueUsd: 100,
          transactionTime: new Date(),
          outputMint: 'Token1111111111111111111111111111111111111111',
          outputSymbol: 'TOKEN1',
          outputAmount: 1,
          outputPrice: 100,
        },
      });
      const transaction2 = await prisma.agentTransaction.create({
        data: {
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          transactionType: TransactionType.SWAP,
          transactionValueUsd: 200,
          transactionTime: new Date(),
          outputMint: 'Token2222222222222222222222222222222222222222',
          outputSymbol: 'TOKEN2',
          outputAmount: 2,
          outputPrice: 200,
        },
      });

      const position1 = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'token1',
        tokenSymbol: 'TOKEN1',
        purchaseTransaction: { connect: { id: transaction1.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      });
      const position2 = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'token2',
        tokenSymbol: 'TOKEN2',
        purchaseTransaction: { connect: { id: transaction2.id } },
        purchasePrice: 200,
        purchaseAmount: 2,
      });

      // Act
      const positions = await repository.findByAgentId(testAgentId);

      // Assert
      expect(positions).toHaveLength(2);
      expect(positions.map(p => p.id)).toContain(position1.id);
      expect(positions.map(p => p.id)).toContain(position2.id);
    });

    it('should return empty array for agent with no positions', async () => {
      // Act
      const positions = await repository.findByAgentId(testAgentId);

      // Assert
      expect(positions).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update position', async () => {
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

      const position = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        purchaseTransaction: { connect: { id: transaction.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      });

      // Act
      const updated = await repository.update(position.id, {
        currentStopLossPercentage: -10,
        peakPrice: 150,
      });

      // Assert - Prisma returns Decimal objects, convert to number for comparison
      expect(updated.currentStopLossPercentage?.toNumber()).toBe(-10);
      expect(updated.peakPrice?.toNumber()).toBe(150);
    });
  });

  describe('delete', () => {
    it('should delete position', async () => {
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

      const position = await repository.create({
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        purchaseTransaction: { connect: { id: transaction.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      });

      // Act
      await repository.delete(position.id);
      const found = await repository.findById(position.id);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('transactions', () => {
    it('should work within a transaction', async () => {
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

      const positionData = {
        agent: { connect: { id: testAgentId } },
        wallet: { connect: { walletAddress: testWalletAddress } },
        tokenAddress: 'So11111111111111111111111111111111111111112',
        tokenSymbol: 'SOL',
        purchaseTransaction: { connect: { id: transaction.id } },
        purchasePrice: 100,
        purchaseAmount: 1,
      };

      // Act
      await prisma.$transaction(async (tx) => {
        const position = await repository.create(positionData, tx);
        const found = await repository.findById(position.id, tx);
        expect(found).not.toBeNull();
      });

      // Assert - Position should be committed
      const positions = await repository.findByAgentId(testAgentId);
      expect(positions).toHaveLength(1);
    });
  });

  // ===========================================
  // Take-Profit Related Tests
  // ===========================================
  describe('Take-Profit Fields', () => {
    describe('update with take-profit fields', () => {
      it('should update take-profit fields on position', async () => {
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
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        const position = await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          purchaseTransaction: { connect: { id: transaction.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act - Update with take-profit fields
        const tpTransactionId = randomUUID();
        const updated = await repository.update(position.id, {
          remainingAmount: 750,
          takeProfitLevelsHit: 1,
          takeProfitTransactionIds: [tpTransactionId],
          lastTakeProfitTime: new Date(),
        });

        // Assert
        expect(updated.remainingAmount?.toNumber()).toBe(750);
        expect(updated.takeProfitLevelsHit).toBe(1);
        expect(updated.takeProfitTransactionIds).toContain(tpTransactionId);
        expect(updated.lastTakeProfitTime).not.toBeNull();
      });

      it('should update moon bag fields on position', async () => {
        // Arrange
        const transaction = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'So11111111111111111111111111111111111111112',
            outputSymbol: 'SOL',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        const position = await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          purchaseTransaction: { connect: { id: transaction.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act - Update with moon bag fields
        const updated = await repository.update(position.id, {
          moonBagActivated: true,
          moonBagAmount: 100, // 10% of 1000
        });

        // Assert
        expect(updated.moonBagActivated).toBe(true);
        expect(updated.moonBagAmount?.toNumber()).toBe(100);
      });
    });

    describe('findPositionsWithTakeProfitActivity', () => {
      it('should find positions with take-profit levels hit', async () => {
        // Arrange - Create two transactions
        const transaction1 = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'Token1111111111111111111111111111111111111111',
            outputSymbol: 'TOKEN1',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });
        const transaction2 = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'Token2222222222222222222222222222222222222222',
            outputSymbol: 'TOKEN2',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        // Position 1: Has take-profit activity
        const position1 = await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'Token1111111111111111111111111111111111111111',
          tokenSymbol: 'TOKEN1',
          purchaseTransaction: { connect: { id: transaction1.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });
        await repository.update(position1.id, {
          takeProfitLevelsHit: 2,
          lastTakeProfitTime: new Date(),
        });

        // Position 2: No take-profit activity
        await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'Token2222222222222222222222222222222222222222',
          tokenSymbol: 'TOKEN2',
          purchaseTransaction: { connect: { id: transaction2.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act
        const positions = await repository.findPositionsWithTakeProfitActivity(testAgentId);

        // Assert
        expect(positions).toHaveLength(1);
        expect(positions[0].id).toBe(position1.id);
        expect(positions[0].takeProfitLevelsHit).toBe(2);
      });

      it('should return empty array when no take-profit activity', async () => {
        // Arrange - Create position without take-profit activity
        const transaction = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'So11111111111111111111111111111111111111112',
            outputSymbol: 'SOL',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          purchaseTransaction: { connect: { id: transaction.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act
        const positions = await repository.findPositionsWithTakeProfitActivity(testAgentId);

        // Assert
        expect(positions).toHaveLength(0);
      });
    });

    describe('findMoonBagPositions', () => {
      it('should find positions with moon bag activated', async () => {
        // Arrange
        const transaction1 = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'Token1111111111111111111111111111111111111111',
            outputSymbol: 'TOKEN1',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });
        const transaction2 = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'Token2222222222222222222222222222222222222222',
            outputSymbol: 'TOKEN2',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        // Position 1: Has moon bag activated
        const position1 = await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'Token1111111111111111111111111111111111111111',
          tokenSymbol: 'TOKEN1',
          purchaseTransaction: { connect: { id: transaction1.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });
        await repository.update(position1.id, {
          moonBagActivated: true,
          moonBagAmount: 100,
          remainingAmount: 100,
        });

        // Position 2: No moon bag
        await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'Token2222222222222222222222222222222222222222',
          tokenSymbol: 'TOKEN2',
          purchaseTransaction: { connect: { id: transaction2.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act
        const positions = await repository.findMoonBagPositions(testAgentId);

        // Assert
        expect(positions).toHaveLength(1);
        expect(positions[0].id).toBe(position1.id);
        expect(positions[0].moonBagActivated).toBe(true);
        expect(positions[0].moonBagAmount?.toNumber()).toBe(100);
      });

      it('should return empty array when no moon bag positions', async () => {
        // Arrange
        const transaction = await prisma.agentTransaction.create({
          data: {
            agent: { connect: { id: testAgentId } },
            wallet: { connect: { walletAddress: testWalletAddress } },
            transactionType: TransactionType.SWAP,
            transactionValueUsd: 100,
            transactionTime: new Date(),
            outputMint: 'So11111111111111111111111111111111111111112',
            outputSymbol: 'SOL',
            outputAmount: 1000,
            outputPrice: 0.001,
          },
        });

        await repository.create({
          agent: { connect: { id: testAgentId } },
          wallet: { connect: { walletAddress: testWalletAddress } },
          tokenAddress: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          purchaseTransaction: { connect: { id: transaction.id } },
          purchasePrice: 0.001,
          purchaseAmount: 1000,
        });

        // Act
        const positions = await repository.findMoonBagPositions(testAgentId);

        // Assert
        expect(positions).toHaveLength(0);
      });
    });
  });
});

