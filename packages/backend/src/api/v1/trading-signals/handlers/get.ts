/**
 * Get trading signal endpoint
 * 
 * GET /api/trading-signals/:id
 * 
 * Returns a single trading signal by ID.
 * Requires authentication.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { TradingSignalResponse } from '../types.js';

/**
 * Get a trading signal by ID
 * 
 * Params: { id: string }
 * Returns: { id, createdAt, updatedAt, tokenAddress, signalType, activationReason, signalStrength }
 */
export async function getTradingSignal(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Signal ID is required',
      });
    }

    // Parse and validate ID as integer
    const signalId = parseInt(id, 10);
    if (isNaN(signalId)) {
      return res.status(400).json({
        error: 'Signal ID must be a valid integer',
      });
    }

    // Get trading signal (scoped to authenticated user)
    const signal = await prisma.tradingSignal.findFirst({
      where: {
        id: signalId,
        userId: req.user.id,
      },
      select: {
        id: true,
        createdAt: true,
        updatedAt: true,
        tokenAddress: true,
        symbol: true,
        signalType: true,
        activationReason: true,
        signalStrength: true,
        source: true,
      },
    });

    if (!signal) {
      return res.status(404).json({
        error: 'Trading signal not found',
      });
    }

    const response: TradingSignalResponse = {
      id: signal.id,
      createdAt: signal.createdAt,
      updatedAt: signal.updatedAt,
      tokenAddress: signal.tokenAddress,
      symbol: signal.symbol,
      signalType: signal.signalType,
      activationReason: signal.activationReason,
      signalStrength: signal.signalStrength,
      source: signal.source,
    };

    res.json(response);
  } catch (error) {
    console.error('Get trading signal error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

