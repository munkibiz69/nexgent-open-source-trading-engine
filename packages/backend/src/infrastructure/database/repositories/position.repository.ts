import type { AgentPosition, Prisma } from '@prisma/client';
import { prisma } from '../client.js';
import type { IPositionRepository } from '@/domain/positions/position.repository.js';

export class PositionRepository implements IPositionRepository {
  private getClient(tx?: Prisma.TransactionClient) {
    return tx || prisma;
  }

  async findById(id: string, tx?: Prisma.TransactionClient): Promise<AgentPosition | null> {
    return this.getClient(tx).agentPosition.findUnique({
      where: { id },
    });
  }

  async findByAgentId(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]> {
    return this.getClient(tx).agentPosition.findMany({
      where: { agentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOpenPositionsByAgentId(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]> {
    return this.getClient(tx).agentPosition.findMany({
      where: { 
        agentId,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: Prisma.AgentPositionCreateInput, tx?: Prisma.TransactionClient): Promise<AgentPosition> {
    return this.getClient(tx).agentPosition.create({
      data,
    });
  }

  async update(id: string, data: Prisma.AgentPositionUpdateInput, tx?: Prisma.TransactionClient): Promise<AgentPosition> {
    return this.getClient(tx).agentPosition.update({
      where: { id },
      data,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient): Promise<void> {
    await this.getClient(tx).agentPosition.delete({
      where: { id },
    });
  }

  /**
   * Find positions that have any take-profit activity (levels hit > 0)
   */
  async findPositionsWithTakeProfitActivity(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]> {
    return this.getClient(tx).agentPosition.findMany({
      where: {
        agentId,
        takeProfitLevelsHit: { gt: 0 },
      },
      orderBy: { lastTakeProfitTime: 'desc' },
    });
  }

  /**
   * Find positions where moon bag has been activated
   */
  async findMoonBagPositions(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]> {
    return this.getClient(tx).agentPosition.findMany({
      where: {
        agentId,
        moonBagActivated: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

