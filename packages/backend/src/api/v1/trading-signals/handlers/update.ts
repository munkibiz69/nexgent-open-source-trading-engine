/**
 * Update trading signal endpoint
 * 
 * PUT /api/trading-signals/:id
 * 
 * Updates an existing trading signal.
 * Requires authentication.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { UpdateTradingSignalRequest, TradingSignalResponse } from '../types.js';

/**
 * Update a trading signal
 * 
 * Params: { id: string }
 * Body: { tokenAddress?: string, signalType?: string, activationReason?: string, signalStrength?: number }
 * Returns: { id, createdAt, updatedAt, tokenAddress, signalType, activationReason, signalStrength }
 */
export async function updateTradingSignal(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const { tokenAddress, symbol, signalType, activationReason, signalStrength, source }: UpdateTradingSignalRequest = req.body;

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

    // Check if signal exists and belongs to the authenticated user
    const existingSignal = await prisma.tradingSignal.findFirst({
      where: { id: signalId, userId: req.user.id },
    });

    if (!existingSignal) {
      return res.status(404).json({
        error: 'Trading signal not found',
      });
    }

    // Build update data
    const updateData: { tokenAddress?: string; symbol?: string | null; signalType?: string; signalStrength?: number; activationReason?: string | null; source?: string | null } = {};

    if (tokenAddress !== undefined) {
      if (typeof tokenAddress !== 'string' || tokenAddress.trim().length === 0) {
        return res.status(400).json({
          error: 'Token address must be a non-empty string',
        });
      }
      if (tokenAddress.length > 255) {
        return res.status(400).json({
          error: 'Token address must be 255 characters or less',
        });
      }
      updateData.tokenAddress = tokenAddress.trim();
    }

    if (symbol !== undefined) {
      if (symbol !== null && (typeof symbol !== 'string' || symbol.trim().length === 0)) {
        return res.status(400).json({
          error: 'Symbol must be a non-empty string or null',
        });
      }
      if (symbol !== null && symbol.length > 50) {
        return res.status(400).json({
          error: 'Symbol must be 50 characters or less',
        });
      }
      updateData.symbol = symbol?.trim() || null;
    }

    if (signalType !== undefined) {
      if (typeof signalType !== 'string' || signalType.trim().length === 0) {
        return res.status(400).json({
          error: 'Signal type must be a non-empty string',
        });
      }
      if (signalType.length > 50) {
        return res.status(400).json({
          error: 'Signal type must be 50 characters or less',
        });
      }
      updateData.signalType = signalType.trim();
    }

    if (activationReason !== undefined) {
      if (activationReason !== null && typeof activationReason !== 'string') {
        return res.status(400).json({
          error: 'Activation reason must be a string or null',
        });
      }
      updateData.activationReason = activationReason?.trim() || null;
    }

    if (signalStrength !== undefined) {
      if (typeof signalStrength !== 'number' || !Number.isInteger(signalStrength)) {
        return res.status(400).json({
          error: 'Signal strength must be an integer',
        });
      }
      if (signalStrength < 1 || signalStrength > 5) {
        return res.status(400).json({
          error: 'Signal strength must be between 1 and 5',
        });
      }
      updateData.signalStrength = signalStrength;
    }

    if (source !== undefined) {
      if (source !== null && typeof source !== 'string') {
        return res.status(400).json({
          error: 'Source must be a string or null',
        });
      }
      if (source !== null && source.length > 100) {
        return res.status(400).json({
          error: 'Source must be 100 characters or less',
        });
      }
      updateData.source = source?.trim() || null;
    }

    // Update trading signal
    const signal = await prisma.tradingSignal.update({
      where: { id: signalId },
      data: updateData,
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
    console.error('Update trading signal error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

