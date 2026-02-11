import type { Agent, AgentWallet, Prisma } from '@prisma/client';
import { prisma } from '../client.js';
import type { IAgentRepository } from '@/domain/agents/agent.repository.js';

export class AgentRepository implements IAgentRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<Agent | null> {
    return this.getClient(tx).agent.findUnique({
      where: { id },
    });
  }

  async findByUserId(userId: string, tx?: Prisma.TransactionClient): Promise<Agent[]> {
    return this.getClient(tx).agent.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.AgentCreateInput, tx?: Prisma.TransactionClient): Promise<Agent> {
    return this.getClient(tx).agent.create({
      data,
    });
  }

  async update(id: string, data: Prisma.AgentUpdateInput, tx?: Prisma.TransactionClient): Promise<Agent> {
    return this.getClient(tx).agent.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).agent.delete({
      where: { id },
    });
  }

  async findWalletByAddress(walletAddress: string, tx?: Prisma.TransactionClient): Promise<(AgentWallet & { agent: Agent }) | null> {
    return this.getClient(tx).agentWallet.findUnique({
      where: { walletAddress },
      include: {
        agent: true,
      },
    });
  }

  async findWalletByAgentId(agentId: string, tradingMode: 'simulation' | 'live', tx?: Prisma.TransactionClient): Promise<AgentWallet | null> {
    return this.getClient(tx).agentWallet.findFirst({
      where: {
        agentId,
        walletType: tradingMode,
      },
    });
  }
}

