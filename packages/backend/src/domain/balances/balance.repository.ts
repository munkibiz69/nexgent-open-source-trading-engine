import type { AgentBalance, Prisma } from '@prisma/client';

export interface IBalanceRepository {
  findByWalletAddressAndTokenAddress(walletAddress: string, tokenAddress: string, tx?: Prisma.TransactionClient): Promise<AgentBalance | null>;
  upsert(
    walletAddress: string,
    agentId: string,
    tokenAddress: string,
    tokenSymbol: string,
    balance: string,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalance>;
  update(id: string, data: Prisma.AgentBalanceUpdateInput, tx?: Prisma.TransactionClient): Promise<AgentBalance>;
  create(data: Prisma.AgentBalanceCreateInput, tx?: Prisma.TransactionClient): Promise<AgentBalance>;
  lockRow(walletAddress: string, tokenAddress: string, tx: Prisma.TransactionClient): Promise<void>;
}

