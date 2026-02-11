/**
 * Update agent endpoint
 * 
 * PUT /api/agents/:id
 * 
 * Updates an existing agent (only if it belongs to the authenticated user).
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { UpdateAgentRequest, AgentResponse } from '../types.js';
import { agentService, AgentServiceError } from '@/domain/agents/agent-service.js';

/**
 * Update an existing agent
 * 
 * Params: { id: string }
 * Body: { name?: string, tradingMode?: 'simulation' | 'live', automatedTradingSimulation?: boolean, automatedTradingLive?: boolean }
 * Returns: { id, userId, name, tradingMode, automatedTradingSimulation, automatedTradingLive, createdAt, updatedAt }
 */
export async function updateAgent(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const { name, tradingMode, automatedTradingSimulation, automatedTradingLive }: UpdateAgentRequest = req.body;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Validate that at least one field is being updated
    if (name === undefined && tradingMode === undefined && 
        automatedTradingSimulation === undefined && automatedTradingLive === undefined) {
      return res.status(400).json({
        error: 'At least one field (name, tradingMode, automatedTradingSimulation, or automatedTradingLive) must be provided',
      });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return res.status(400).json({
          error: 'Name must be a non-empty string',
        });
      }

      if (name.length > 255) {
        return res.status(400).json({
          error: 'Name must be 255 characters or less',
        });
      }
    }

    // Validate tradingMode if provided
    if (tradingMode !== undefined) {
      if (tradingMode !== 'simulation' && tradingMode !== 'live') {
        return res.status(400).json({
          error: "Trading mode must be either 'simulation' or 'live'",
        });
      }
    }

    // Validate automatedTradingSimulation if provided
    if (automatedTradingSimulation !== undefined) {
      if (typeof automatedTradingSimulation !== 'boolean') {
        return res.status(400).json({
          error: 'automatedTradingSimulation must be a boolean',
        });
      }
    }

    // Validate automatedTradingLive if provided
    if (automatedTradingLive !== undefined) {
      if (typeof automatedTradingLive !== 'boolean') {
        return res.status(400).json({
          error: 'automatedTradingLive must be a boolean',
        });
      }
    }

    // Check if agent exists and belongs to the authenticated user
    const existingAgent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only update their own agents
      },
    });

    if (!existingAgent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Update agent (service handles DB update and cache invalidation)
    const agent = await agentService.updateAgent(id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(tradingMode !== undefined && { tradingMode }),
      ...(automatedTradingSimulation !== undefined && { automatedTradingSimulation }),
      ...(automatedTradingLive !== undefined && { automatedTradingLive }),
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

    res.json(response);
  } catch (error) {
    console.error('Update agent error:', error);
    
    // Handle service errors
    if (error instanceof AgentServiceError) {
      if (error.code === 'AGENT_NOT_FOUND') {
        return res.status(404).json({
          error: error.message,
        });
      }
      return res.status(400).json({
        error: error.message,
        code: error.code,
      });
    }
    
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
