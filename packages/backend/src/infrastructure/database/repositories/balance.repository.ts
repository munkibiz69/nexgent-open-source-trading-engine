import type { AgentBalance, Prisma } from '@prisma/client';
import { prisma } from '../client.js';
import type { IBalanceRepository } from '@/domain/balances/balance.repository.js';

export class BalanceRepository implements IBalanceRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findByWalletAddressAndTokenAddress(walletAddress: string, tokenAddress: string, tx?: Prisma.TransactionClient): Promise<AgentBalance | null> {
    return this.getClient(tx).agentBalance.findUnique({
      where: {
        walletAddress_tokenAddress: {
          walletAddress,
          tokenAddress,
        },
      },
    });
  }

  async upsert(
    walletAddress: string,
    agentId: string,
    tokenAddress: string,
    tokenSymbol: string,
    balance: string,
    tx?: Prisma.TransactionClient
  ): Promise<AgentBalance> {
    // Prisma upsert doesn't work well if we need custom logic like preventing negative balances check *before* update,
    // but for repository we typically just expose the primitive.
    // However, the service does check existing balance.
    // Here we can just expose upsert or create/update separately. Service logic handles the decision.
    // Using upsert here for convenience if exact match.
    return this.getClient(tx).agentBalance.upsert({
      where: {
        walletAddress_tokenAddress: {
          walletAddress,
          tokenAddress,
        },
      },
      update: {
        balance,
        tokenSymbol,
      },
      create: {
        agentId,
        walletAddress,
        tokenAddress,
        tokenSymbol,
        balance,
      },
    });
  }

  async update(id: string, data: Prisma.AgentBalanceUpdateInput, tx?: Prisma.TransactionClient): Promise<AgentBalance> {
    return this.getClient(tx).agentBalance.update({
      where: { id },
      data,
    });
  }

  async create(data: Prisma.AgentBalanceCreateInput, tx?: Prisma.TransactionClient): Promise<AgentBalance> {
    return this.getClient(tx).agentBalance.create({
      data,
    });
  }

  async lockRow(walletAddress: string, tokenAddress: string, tx: Prisma.TransactionClient): Promise<void> {
    // Use raw SQL to lock the row
    await tx.$executeRaw`
      SELECT balance 
      FROM agent_balances 
      WHERE wallet_address = ${walletAddress}
        AND token_address = ${tokenAddress}
      FOR UPDATE
    `;
  }
}

