/**
 * Execute Trade Endpoint
 * 
 * POST /api/trades/execute
 * 
 * Executes a trade using the Trading Executor service.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { tradingExecutor } from '@/domain/trading/trading-executor.service.js';
import { BaseError } from '@/shared/errors/base.error.js';

/**
 * Execute a trade
 * 
 * Request Body:
 * {
 *   agentId: string;
 *   walletAddress?: string;  // Optional: uses default wallet if not provided
 *   tokenAddress: string;
 *   tokenSymbol?: string;  // Optional: will be fetched if not provided
 *   signalId?: number;  // Optional: link to trading signal
 *   positionSize?: number;  // Optional: override calculated position size (in SOL)
 * }
 */
export async function executeTrade(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agentId, walletAddress, tokenAddress, tokenSymbol, signalId, positionSize } = req.body;

    // Validate required fields
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'agentId is required and must be a string',
      });
    }

    if (!tokenAddress || typeof tokenAddress !== 'string') {
      return res.status(400).json({
        error: 'tokenAddress is required and must be a string',
      });
    }

    // Validate UUID format for agentId
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Validate optional fields if provided
    if (walletAddress !== undefined && walletAddress !== null && typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'walletAddress must be a string if provided',
      });
    }

    if (tokenSymbol !== undefined && tokenSymbol !== null && typeof tokenSymbol !== 'string') {
      return res.status(400).json({
        error: 'tokenSymbol must be a string if provided',
      });
    }

    if (signalId !== undefined && signalId !== null && (typeof signalId !== 'number' || isNaN(signalId))) {
      return res.status(400).json({
        error: 'signalId must be a valid number if provided',
      });
    }

    if (positionSize !== undefined && positionSize !== null && (typeof positionSize !== 'number' || positionSize <= 0)) {
      return res.status(400).json({
        error: 'positionSize must be a positive number if provided',
      });
    }

    // Execute trade
    const result = await tradingExecutor.executePurchase({
      agentId,
      walletAddress,
      tokenAddress: tokenAddress.trim(),
      tokenSymbol: tokenSymbol?.trim(),
      signalId: signalId || undefined,
      positionSize: positionSize || undefined,
    });

    res.json(result);
  } catch (error) {
    console.error('Trade execution error:', error);
    
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
        errorMessage.includes('already exists') ||
        errorMessage.includes('Already exists')
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

