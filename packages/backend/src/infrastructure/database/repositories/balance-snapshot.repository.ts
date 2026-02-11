import type { AgentBalanceSnapshot, Prisma } from '@prisma/client';
import { prisma } from '../client.js';
import type { IBalanceSnapshotRepository } from '@/domain/balances/balance-snapshot.repository.js';

export class BalanceSnapshotRepository implements IBalanceSnapshotRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async upsert(
    agentId: string,
    walletAddress: string,
    snapshotTimestamp: Date,
    portfolioBalanceSol: Prisma.Decimal,
    solBalance: Prisma.Decimal,
    positionsValueSol: Prisma.Decimal,
    unrealizedPnLSol: Prisma.Decimal,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot> {
    const client = this.getClient(tx);

    return client.agentBalanceSnapshot.upsert({
      where: {
        agentId_walletAddress_snapshotTimestamp: {
          agentId,
          walletAddress,
          snapshotTimestamp,
        },
      },
      update: {
        portfolioBalanceSol,
        solBalance,
        positionsValueSol,
        unrealizedPnLSol,
      },
      create: {
        agentId,
        walletAddress,
        snapshotTimestamp,
        portfolioBalanceSol,
        solBalance,
        positionsValueSol,
        unrealizedPnLSol,
      },
    });
  }

  async findByAgentAndTimeframe(
    agentId: string,
    walletAddress: string,
    timeframe: '24h' | 'all',
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot[]> {
    const client = this.getClient(tx);

    if (timeframe === '24h') {
      // Return hourly snapshots from last 24-25 hours (buffer for safety)
      const twentyFourHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

      return client.agentBalanceSnapshot.findMany({
        where: {
          agentId,
          walletAddress,
          snapshotTimestamp: {
            gte: twentyFourHoursAgo,
          },
        },
        orderBy: {
          snapshotTimestamp: 'asc',
        },
      });
    } else {
      // For 'all' timeframe: return daily snapshots (midnight/00:00 only)
      // Use raw SQL for efficient filtering on large datasets
      // Prisma.$queryRawUnsafe is used here for complex SQL with EXTRACT
      const result = await client.$queryRawUnsafe<AgentBalanceSnapshot[]>(
        `SELECT 
          id,
          agent_id as "agentId",
          wallet_address as "walletAddress",
          snapshot_timestamp as "snapshotTimestamp",
          portfolio_balance_sol as "portfolioBalanceSol",
          sol_balance as "solBalance",
          positions_value_sol as "positionsValueSol",
          unrealized_pnl_sol as "unrealizedPnLSol",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM agent_balance_snapshots
        WHERE agent_id = $1::uuid
          AND wallet_address = $2::varchar
          AND EXTRACT(HOUR FROM snapshot_timestamp) = 0
        ORDER BY snapshot_timestamp ASC`,
        agentId,
        walletAddress
      );

      return result;
    }
  }

  async findLatestForAgent(
    agentId: string,
    walletAddress: string,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalanceSnapshot | null> {
    const client = this.getClient(tx);

    return client.agentBalanceSnapshot.findFirst({
      where: {
        agentId,
        walletAddress,
      },
      orderBy: {
        snapshotTimestamp: 'desc',
      },
    });
  }

  async deleteOlderThan(
    timestamp: Date,
    tx?: Prisma.TransactionClient
  ): Promise<number> {
    const client = this.getClient(tx);

    const result = await client.agentBalanceSnapshot.deleteMany({
      where: {
        snapshotTimestamp: {
          lt: timestamp,
        },
      },
    });

    return result.count;
  }
}
