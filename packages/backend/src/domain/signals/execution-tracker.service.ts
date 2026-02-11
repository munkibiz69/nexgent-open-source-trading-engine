/**
 * Signal Execution Tracker
 * 
 * Tracks the status of signal processing for each agent.
 * Prevents duplicate executions and records results.
 */

import { prisma } from '@/infrastructure/database/client.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';

export enum ExecutionStatus {
  PENDING = 'PENDING',
  EXECUTED = 'EXECUTED',
  FAILED = 'FAILED',
  SKIPPED = 'SKIPPED',
}

export class SignalExecutionService {
  private static instance: SignalExecutionService;

  private constructor() {}

  public static getInstance(): SignalExecutionService {
    if (!SignalExecutionService.instance) {
      SignalExecutionService.instance = new SignalExecutionService();
    }
    return SignalExecutionService.instance;
  }

  /**
   * Create a pending execution record
   * Returns null if execution already exists (deduplication)
   */
  public async createPendingExecution(signalId: number, agentId: string): Promise<string | null> {
    const executionKey = REDIS_KEYS.SIGNAL_EXECUTIONS(`${signalId}:${agentId}`);
    
    // 1. Check Redis first (fast deduplication)
    const cached = await redisService.get(executionKey);
    if (cached) {
      return null;
    }

    // 2. Create DB record
    try {
      const execution = await prisma.signalExecution.create({
        data: {
          signalId,
          agentId,
          status: ExecutionStatus.PENDING,
        },
        select: { id: true }
      });

      // 3. Cache in Redis (no TTL - execution records are in DB, Redis is just for fast deduplication)
      await redisService.set(executionKey, ExecutionStatus.PENDING);

      return execution.id;
    } catch (error: unknown) {
      // Handle unique constraint violation (race condition)
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update execution status to success
   */
  public async updateExecutionSuccess(executionId: string, transactionId: string): Promise<void> {
    await prisma.signalExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.EXECUTED,
        transactionId: transactionId,
        executedAt: new Date(),
      },
    });

    // Update Redis cache if needed (optional, as PENDING key prevents re-entry)
  }

  /**
   * Update execution status to failure
   */
  public async updateExecutionFailure(executionId: string, error: Error): Promise<void> {
    await prisma.signalExecution.update({
      where: { id: executionId },
      data: {
        status: ExecutionStatus.FAILED,
        error: error.message,
        executedAt: new Date(),
      },
    });
  }

    /**
   * Update execution status to skipped
   */
    public async updateExecutionSkipped(executionId: string, reason: string): Promise<void> {
      await prisma.signalExecution.update({
        where: { id: executionId },
        data: {
          status: ExecutionStatus.SKIPPED,
          error: reason,
          executedAt: new Date(),
        },
      });
    }
}

export const signalExecutionService = SignalExecutionService.getInstance();

