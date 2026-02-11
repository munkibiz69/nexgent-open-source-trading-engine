/**
 * Get agent endpoint
 * 
 * GET /api/agents/:id
 * 
 * Returns a specific agent by ID (only if it belongs to the authenticated user).
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { AgentResponse } from '../types.js';

/**
 * Get a specific agent by ID
 * 
 * Params: { id: string }
 * Returns: { id, userId, name, tradingMode, createdAt, updatedAt }
 */
export async function getAgent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Get agent (only if it belongs to the authenticated user)
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only access their own agents
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
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    const response: AgentResponse = {
      id: agent.id,
      userId: agent.userId,
      name: agent.name,
      tradingMode: agent.tradingMode as 'simulation' | 'live',
      automatedTradingSimulation: agent.automatedTradingSimulation,
      automatedTradingLive: agent.automatedTradingLive,
      createdAt: agent.createdAt,
      updatedAt: agent.updatedAt,
    };

    res.json(response);
  } catch (error) {
    console.error('Get agent error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

