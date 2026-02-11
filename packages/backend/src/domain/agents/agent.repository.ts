import type { Agent, AgentWallet, Prisma } from '@prisma/client';

export interface IAgentRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<Agent | null>;
  findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<Agent[]>;
  create(data: Prisma.AgentCreateInput, tx?: Prisma.TransactionClient): Promise<Agent>;
  update(id: string, data: Prisma.AgentUpdateInput, tx?: Prisma.TransactionClient): Promise<Agent>;
  delete(id: string, tx?: Prisma.TransactionClient): Promise<void>;
  
  // Wallet related methods
  findWalletByAddress(walletAddress: string, tx?: Prisma.TransactionClient): Promise<(AgentWallet & { agent: Agent }) | null>;
  findWalletByAgentId(agentId: string, tradingMode: 'simulation' | 'live', tx?: Prisma.TransactionClient): Promise<AgentWallet | null>;
}
