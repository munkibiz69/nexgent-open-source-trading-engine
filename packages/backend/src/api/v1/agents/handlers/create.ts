/**
 * Create agent endpoint
 * 
 * POST /api/agents
 * 
 * Creates a new agent for the authenticated user.
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { CreateAgentRequest, AgentResponse } from '../types.js';
import { agentService } from '@/domain/agents/agent-service.js';

/**
 * Create a new agent
 * 
 * Body: { name: string, tradingMode?: 'simulation' | 'live' }
 * Returns: { id, userId, name, tradingMode, createdAt, updatedAt }
 */
export async function createAgent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { name, tradingMode }: CreateAgentRequest = req.body;

    // Validate input
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        error: 'Name is required',
      });
    }

    // Validate name length
    if (name.length > 255) {
      return res.status(400).json({
        error: 'Name must be 255 characters or less',
      });
    }

    // Validate tradingMode if provided
    if (tradingMode !== undefined) {
      if (tradingMode !== 'simulation' && tradingMode !== 'live') {
        return res.status(400).json({
          error: "Trading mode must be either 'simulation' or 'live'",
        });
      }
    }

    // Create agent (service handles DB, wallet creation, and cache sync)
    const agent = await agentService.createAgent({
      userId: req.user.id,
      name: name.trim(),
      tradingMode,
    });

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

    res.status(201).json(response);
  } catch (error) {
    console.error('Create agent error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

