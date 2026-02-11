/**
 * List trading signals endpoint
 * 
 * GET /api/trading-signals
 * 
 * Returns trading signals with optional filtering.
 * Requires authentication.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { TradingSignalResponse, ListTradingSignalsQuery } from '../types.js';

/**
 * Get trading signals with optional filters
 * 
 * Query params:
 * - tokenAddress: Filter by token address
 * - signalType: Filter by signal type
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * - limit: Maximum number of results (default: 100)
 * - offset: Number of results to skip (default: 0)
 * 
 * Returns: Array of { id, createdAt, updatedAt, tokenAddress, signalType, activationReason, signalStrength }
 */
export async function listTradingSignals(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const query = req.query as unknown as ListTradingSignalsQuery;

    // Build where clause — always scoped to the authenticated user
    const where: { userId: string; tokenAddress?: string; signalType?: string; createdAt?: { gte?: Date; lte?: Date } } = {
      userId: req.user.id,
    };

    if (query.tokenAddress) {
      where.tokenAddress = query.tokenAddress.trim();
    }

    if (query.signalType) {
      where.signalType = query.signalType.trim();
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // Parse pagination
    const limit = query.limit ? Math.min(parseInt(query.limit, 10), 1000) : 100;
    const offset = query.offset ? parseInt(query.offset, 10) : 0;

    // Validate pagination
    if (isNaN(limit) || limit < 1) {
      return res.status(400).json({
        error: 'Limit must be a positive number',
      });
    }

    if (isNaN(offset) || offset < 0) {
      return res.status(400).json({
        error: 'Offset must be a non-negative number',
      });
    }

    // Get trading signals
    const signals = await prisma.tradingSignal.findMany({
      where,
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
      orderBy: {
        createdAt: 'desc', // Most recent first
      },
      take: limit,
      skip: offset,
    });

    const response: TradingSignalResponse[] = signals.map((signal) => ({
      id: signal.id,
      createdAt: signal.createdAt,
      updatedAt: signal.updatedAt,
      tokenAddress: signal.tokenAddress,
      symbol: signal.symbol,
      signalType: signal.signalType,
      activationReason: signal.activationReason,
      signalStrength: signal.signalStrength,
      source: signal.source,
    }));

    res.json(response);
  } catch (error) {
    console.error('List trading signals error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

