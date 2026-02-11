import type { AgentTransaction, AgentHistoricalSwap, Prisma } from '@prisma/client';

export interface ITransactionRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<AgentTransaction | null>;
  create(data: Prisma.AgentTransactionCreateInput, tx?: Prisma.TransactionClient): Promise<AgentTransaction>;
  createHistoricalSwap(data: Prisma.AgentHistoricalSwapCreateInput, tx?: Prisma.TransactionClient): Promise<AgentHistoricalSwap>;
}
