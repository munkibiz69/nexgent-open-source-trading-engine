import type { AgentPosition, Prisma } from '@prisma/client';

export interface IPositionRepository {
  findById(id: string, tx?: Prisma.TransactionClient): Promise<AgentPosition | null>;
  findByAgentId(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]>;
  findOpenPositionsByAgentId(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]>;
  create(data: Prisma.AgentPositionCreateInput, tx?: Prisma.TransactionClient): Promise<AgentPosition>;
  update(id: string, data: Prisma.AgentPositionUpdateInput, tx?: Prisma.TransactionClient): Promise<AgentPosition>;
  delete(id: string, tx?: Prisma.TransactionClient): Promise<void>;
  
  // Take-profit specific queries
  findPositionsWithTakeProfitActivity(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]>;
  findMoonBagPositions(agentId: string, tx?: Prisma.TransactionClient): Promise<AgentPosition[]>;
}
