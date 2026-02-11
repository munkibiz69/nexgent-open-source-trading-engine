/**
 * Execution Tracker Service Unit Tests
 * 
 * Tests signal execution tracking and deduplication logic.
 */

import { signalExecutionService, ExecutionStatus } from '@/domain/signals/execution-tracker.service.js';
import { REDIS_KEYS, REDIS_TTL } from '@/shared/constants/redis-keys.js';

// Mock dependencies
jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    signalExecution: {
      create: jest.fn(),
      update: jest.fn(),
    },
  },
}));

jest.mock('@/infrastructure/cache/redis-client.js', () => ({
  redisService: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

describe('SignalExecutionService', () => {
  let mockPrisma: any;
  let mockRedisService: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Get mocked services
    const prismaModule = await import('@/infrastructure/database/client.js');
    mockPrisma = prismaModule.prisma;

    const redisServiceModule = await import('@/infrastructure/cache/redis-client.js');
    mockRedisService = redisServiceModule.redisService;
  });

  describe('createPendingExecution', () => {
    it('should return null if execution already exists in Redis', async () => {
      // Arrange
      const signalId = 123;
      const agentId = 'agent-123';
      const executionKey = REDIS_KEYS.SIGNAL_EXECUTIONS(`${signalId}:${agentId}`);
      mockRedisService.get.mockResolvedValue(ExecutionStatus.PENDING);

      // Act
      const result = await signalExecutionService.createPendingExecution(signalId, agentId);

      // Assert
      expect(result).toBeNull();
      expect(mockRedisService.get).toHaveBeenCalledWith(executionKey);
      expect(mockPrisma.signalExecution.create).not.toHaveBeenCalled();
    });

    it('should create execution record when not in Redis', async () => {
      // Arrange
      const signalId = 123;
      const agentId = 'agent-123';
      const executionId = 'exec-456';
      const executionKey = REDIS_KEYS.SIGNAL_EXECUTIONS(`${signalId}:${agentId}`);

      mockRedisService.get.mockResolvedValue(null);
      mockPrisma.signalExecution.create.mockResolvedValue({ id: executionId });
      mockRedisService.set.mockResolvedValue('OK');

      // Act
      const result = await signalExecutionService.createPendingExecution(signalId, agentId);

      // Assert
      expect(result).toBe(executionId);
      expect(mockRedisService.get).toHaveBeenCalledWith(executionKey);
      expect(mockPrisma.signalExecution.create).toHaveBeenCalledWith({
        data: {
          signalId,
          agentId,
          status: ExecutionStatus.PENDING,
        },
        select: { id: true },
      });
      expect(mockRedisService.set).toHaveBeenCalledWith(
        executionKey,
        ExecutionStatus.PENDING
      );
    });

    it('should return null on unique constraint violation (race condition)', async () => {
      // Arrange
      const signalId = 123;
      const agentId = 'agent-123';
      const executionKey = REDIS_KEYS.SIGNAL_EXECUTIONS(`${signalId}:${agentId}`);

      mockRedisService.get.mockResolvedValue(null);
      const prismaError = new Error('Unique constraint violation');
      (prismaError as any).code = 'P2002';
      mockPrisma.signalExecution.create.mockRejectedValue(prismaError);

      // Act
      const result = await signalExecutionService.createPendingExecution(signalId, agentId);

      // Assert
      expect(result).toBeNull();
      expect(mockRedisService.get).toHaveBeenCalledWith(executionKey);
      expect(mockPrisma.signalExecution.create).toHaveBeenCalled();
    });

    it('should throw error on other database errors', async () => {
      // Arrange
      const signalId = 123;
      const agentId = 'agent-123';
      const executionKey = REDIS_KEYS.SIGNAL_EXECUTIONS(`${signalId}:${agentId}`);

      mockRedisService.get.mockResolvedValue(null);
      const dbError = new Error('Database connection failed');
      (dbError as any).code = 'P1001';
      mockPrisma.signalExecution.create.mockRejectedValue(dbError);

      // Act & Assert
      await expect(
        signalExecutionService.createPendingExecution(signalId, agentId)
      ).rejects.toThrow('Database connection failed');
      expect(mockRedisService.get).toHaveBeenCalledWith(executionKey);
    });
  });

  describe('updateExecutionSuccess', () => {
    it('should update execution status to EXECUTED', async () => {
      // Arrange
      const executionId = 'exec-456';
      const transactionId = 'tx-789';

      mockPrisma.signalExecution.update.mockResolvedValue({});

      // Act
      await signalExecutionService.updateExecutionSuccess(executionId, transactionId);

      // Assert
      expect(mockPrisma.signalExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.EXECUTED,
          transactionId,
          executedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateExecutionFailure', () => {
    it('should update execution status to FAILED with error message', async () => {
      // Arrange
      const executionId = 'exec-456';
      const error = new Error('Insufficient balance');

      mockPrisma.signalExecution.update.mockResolvedValue({});

      // Act
      await signalExecutionService.updateExecutionFailure(executionId, error);

      // Assert
      expect(mockPrisma.signalExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: 'Insufficient balance',
          executedAt: expect.any(Date),
        },
      });
    });

    it('should handle errors with custom messages', async () => {
      // Arrange
      const executionId = 'exec-456';
      const error = new Error('Custom error message');

      mockPrisma.signalExecution.update.mockResolvedValue({});

      // Act
      await signalExecutionService.updateExecutionFailure(executionId, error);

      // Assert
      expect(mockPrisma.signalExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.FAILED,
          error: 'Custom error message',
          executedAt: expect.any(Date),
        },
      });
    });
  });

  describe('updateExecutionSkipped', () => {
    it('should update execution status to SKIPPED with reason', async () => {
      // Arrange
      const executionId = 'exec-456';
      const reason = 'Agent not eligible';

      mockPrisma.signalExecution.update.mockResolvedValue({});

      // Act
      await signalExecutionService.updateExecutionSkipped(executionId, reason);

      // Assert
      expect(mockPrisma.signalExecution.update).toHaveBeenCalledWith({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.SKIPPED,
          error: reason,
          executedAt: expect.any(Date),
        },
      });
    });
  });
});

