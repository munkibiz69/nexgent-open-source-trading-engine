/**
 * List agents endpoint
 * 
 * GET /api/agents
 * 
 * Returns all agents for the authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { AgentResponse } from '../types.js';

/**
 * Get all agents for the authenticated user
 * 
 * Returns: Array of { id, userId, name, tradingMode, createdAt, updatedAt }
 */
export async function listAgents(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Get all agents for the authenticated user
    const agents = await prisma.agent.findMany({
      where: {
        userId: req.user.id,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        tradingMode: true,
        automatedTradingSimulation: true,
        automatedTradingLive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
    });

    const response: AgentResponse[] = agents.map((agent) => ({
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      tradingMode: agent.tradingMode as 'simulation' | 'live',
      automatedTradingSimulation: agent.automatedTradingSimulation,
      automatedTradingLive: agent.automatedTradingLive,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    }));

    res.json(response);
  } catch (error) {
    console.error('List agents error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

