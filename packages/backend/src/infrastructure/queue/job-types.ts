/**
 * Queue Job Types
 * 
 * Definitions for all async jobs processed by the queue system.
 */

import type { Prisma } from '@prisma/client';

export enum QueueName {
  DATABASE_WRITES = 'database-writes',
}

export enum JobType {
  // Transaction related
  WRITE_TRANSACTION = 'write-transaction',
  WRITE_HISTORICAL_SWAP = 'write-historical-swap',
  // Balance snapshot related
  CAPTURE_BALANCE_SNAPSHOT = 'capture-balance-snapshot',
}

// Job Payload Interfaces

export interface WriteTransactionJob {
  type: JobType.WRITE_TRANSACTION;
  data: Prisma.AgentTransactionCreateInput;
}

export interface WriteHistoricalSwapJob {
  type: JobType.WRITE_HISTORICAL_SWAP;
  data: Prisma.AgentHistoricalSwapCreateInput;
}

export interface CaptureBalanceSnapshotJob {
  type: JobType.CAPTURE_BALANCE_SNAPSHOT;
  agentId?: string; // Optional: if provided, snapshot single agent; if not, snapshot all
  walletAddress?: string; // Optional: if provided with agentId, snapshot single wallet; if not, snapshot all wallets
}

export type DatabaseWriteJob = 
  | WriteTransactionJob
  | WriteHistoricalSwapJob
  | CaptureBalanceSnapshotJob;

