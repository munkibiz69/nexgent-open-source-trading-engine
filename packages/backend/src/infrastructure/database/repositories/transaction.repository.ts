import type { AgentTransaction, AgentHistoricalSwap, Prisma } from '@prisma/client';
import { prisma } from '../client.js';
import type { ITransactionRepository } from '@/domain/transactions/transaction.repository.js';

export class TransactionRepository implements ITransactionRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<AgentTransaction | null> {
    return this.getClient(tx).agentTransaction.findUnique({
      where: { id },
    });
  }

  async create(data: Prisma.AgentTransactionCreateInput, tx?: Prisma.TransactionClient): Promise<AgentTransaction> {
    return this.getClient(tx).agentTransaction.create({
      data,
    });
  }

  async createHistoricalSwap(data: Prisma.AgentHistoricalSwapCreateInput, tx?: Prisma.TransactionClient): Promise<AgentHistoricalSwap> {
    return this.getClient(tx).agentHistoricalSwap.create({
      data,
    });
  }
}

