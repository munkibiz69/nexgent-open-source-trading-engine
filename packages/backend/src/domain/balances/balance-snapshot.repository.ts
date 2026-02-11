import type { AgentBalanceSnapshot, Prisma } from '@prisma/client';

export interface IBalanceSnapshotRepository {
  /**
   * Create or update a balance snapshot (idempotent)
   * Uses upsert to handle duplicate snapshots if job runs twice
   */
  upsert(
    agentId: string,
    walletAddress: string,
    snapshotTimestamp: Date,
    portfolioBalanceSol: Prisma.Decimal,
    solBalance: Prisma.Decimal,
    positionsValueSol: Prisma.Decimal,
    unrealizedPnLSol: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot>;

  /**
   * Find balance snapshots for an agent and wallet within a timeframe
   * @param agentId - Agent ID
   * @param walletAddress - Wallet address
   * @param timeframe - '24h' for hourly snapshots (last 24 hours), 'all' for daily snapshots (midnight only)
   */
  findByAgentAndTimeframe(
    agentId: string,
    walletAddress: string,
    timeframe: '24h' | 'all',
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot[]>;

  /**
   * Get the most recent snapshot for an agent and wallet
   */
  findLatestForAgent(
    agentId: string,
    walletAddress: string,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot | null>;

  /**
   * Delete snapshots older than the specified timestamp
   * Used for cleanup/retention policies
   */
  deleteOlderThan(
    timestamp: Date,
    tx?: Prisma.TransactionClient
  ): Promise<number>;
}
