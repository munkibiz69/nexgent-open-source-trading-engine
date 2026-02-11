/**
 * Agent Repository Integration Tests
 * 
 * Tests database operations for agents with real database.
 */

import { AgentRepository } from '@/infrastructure/database/repositories/agent.repository.js';
import { getTestPrisma, cleanupTestDatabase, disconnectTestDatabase } from '../../helpers/test-db.js';
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';

describe('AgentRepository Integration', () => {
  let repository: AgentRepository;
  let prisma: ReturnType<typeof getTestPrisma>;
  let testUserId: string;

  beforeAll(async () => {
    prisma = getTestPrisma();
    repository = new AgentRepository();
  });

  beforeEach(async () => {
    await cleanupTestDatabase(prisma);
    
    // Create test user
    testUserId = randomUUID();
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${testUserId}@example.com`, // Unique email per test
        passwordHash: 'hash',
      },
    });
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  describe('create', () => {
    it('should create an agent', async () => {
      // Arrange
      const agentData = {
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation' as const,
      };

      // Act
      const agent = await repository.create(agentData);

      // Assert
      expect(agent).not.toBeNull();
      expect(agent.id).toBeDefined();
      expect(agent.userId).toBe(testUserId);
      expect(agent.name).toBe('Test Agent');
      expect(agent.tradingMode).toBe('simulation');
    });
  });

  describe('findById', () => {
    it('should find agent by id', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Act
      const found = await repository.findById(agent.id);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.id).toBe(agent.id);
    });

    it('should return null for non-existent agent', async () => {
      // Act - Use a valid UUID format
      const found = await repository.findById(randomUUID());

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findByUserId', () => {
    it('should find all agents for a user', async () => {
      // Arrange
      const agent1 = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Agent 1',
        tradingMode: 'simulation',
      });
      const agent2 = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Agent 2',
        tradingMode: 'simulation',
      });

      // Act
      const agents = await repository.findByUserId(testUserId);

      // Assert
      expect(agents).toHaveLength(2);
      expect(agents.map(a => a.id)).toContain(agent1.id);
      expect(agents.map(a => a.id)).toContain(agent2.id);
    });

    it('should return empty array for user with no agents', async () => {
      // Act
      const agents = await repository.findByUserId(testUserId);

      // Assert
      expect(agents).toHaveLength(0);
    });
  });

  describe('update', () => {
    it('should update agent', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Act
      const updated = await repository.update(agent.id, {
        name: 'Updated Agent',
      });

      // Assert
      expect(updated.name).toBe('Updated Agent');
    });
  });

  describe('delete', () => {
    it('should delete agent', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Act
      await repository.delete(agent.id);
      const found = await repository.findById(agent.id);

      // Assert
      expect(found).toBeNull();
    });
  });

  describe('findWalletByAddress', () => {
    it('should find wallet by address', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });
      const walletAddress = 'test-address-123';
      const wallet = await prisma.agentWallet.create({
        data: {
          agentId: agent.id,
          walletAddress,
          walletType: 'simulation',
        },
      });

      // Act
      const found = await repository.findWalletByAddress(walletAddress);

      // Assert
      expect(found).not.toBeNull();
      expect(found?.walletAddress).toBe(walletAddress);
      expect(found?.agent).not.toBeNull();
    });
  });

  describe('findWalletByAgentId', () => {
    it('should find wallet by agent id and trading mode', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });
      const walletAddress = 'test-address-456';
      const wallet = await prisma.agentWallet.create({
        data: {
          agentId: agent.id,
          walletAddress,
          walletType: 'simulation',
        },
      });

      // Act
      const found = await repository.findWalletByAgentId(agent.id, 'simulation');

      // Assert
      expect(found).not.toBeNull();
      expect(found?.walletAddress).toBe(walletAddress);
    });

    it('should return null if no wallet matches', async () => {
      // Arrange
      const agent = await repository.create({
        user: { connect: { id: testUserId } },
        name: 'Test Agent',
        tradingMode: 'simulation',
      });

      // Act
      const found = await repository.findWalletByAgentId(agent.id, 'live');

      // Assert
      expect(found).toBeNull();
    });
  });
});

