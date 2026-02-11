/**
 * Close Position Endpoint
 * 
 * POST /api/v1/agent-positions/:agentId/:positionId/close
 * 
 * Closes a position by executing a sell trade.
 * Requires authentication. Users can only close positions for their own agents.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { tradingExecutor } from '@/domain/trading/trading-executor.service.js';
import { BaseError } from '@/shared/errors/base.error.js';

/**
 * Close a position
 * 
 * Body: { reason?: 'manual' | 'stop_loss' }
 * Returns: { success, transactionId, historicalSwapId, profitLossSol, profitLossUsd, changePercent, transactionHash }
 */
export async function closeAgentPosition(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { agentId } = req.params;
    const { positionId } = req.params;
    const { reason = 'manual' } = req.body;

    // Validate agent ID
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    // Validate position ID
    if (!positionId || typeof positionId !== 'string') {
      return res.status(400).json({
        error: 'Position ID is required',
      });
    }

    // Validate reason
    if (reason && reason !== 'manual' && reason !== 'stop_loss') {
      return res.status(400).json({
        error: 'Reason must be either "manual" or "stop_loss"',
      });
    }

    // Verify agent belongs to the authenticated user
    const agent = await prisma.agent.findUnique({
      where: { id: agentId },
      select: { userId: true },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    if (agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only close positions for your own agents',
      });
    }

    // Execute sale
    const result = await tradingExecutor.executeSale({
      agentId,
      positionId,
      reason: reason as 'manual' | 'stop_loss',
    });

    res.json(result);
  } catch (error) {
    console.error('Close position error:', error);

    // Handle known error types
    if (error instanceof Error) {
      const errorMessage = error.message;
      const errorCode = error instanceof BaseError ? error.code : undefined;
      const errorDetails = error instanceof BaseError ? error.details : undefined;

      // Determine status code based on error type
      let statusCode = 500;
      if (errorMessage.includes('not found') || errorMessage.includes('Not found')) {
        statusCode = 404;
      } else if (
        errorMessage.includes('validation') ||
        errorMessage.includes('Validation') ||
        errorMessage.includes('insufficient') ||
        errorMessage.includes('Insufficient') ||
        errorMessage.includes('mismatch') ||
        errorMessage.includes('Mismatch')
      ) {
        statusCode = 400;
      }

      return res.status(statusCode).json({
        error: errorMessage,
        code: errorCode,
        details: errorDetails,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

