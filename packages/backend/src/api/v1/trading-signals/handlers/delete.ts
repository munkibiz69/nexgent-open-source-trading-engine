/**
 * Delete trading signal endpoint
 * 
 * DELETE /api/trading-signals/:id
 * 
 * Deletes a trading signal.
 * Requires authentication.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Delete a trading signal
 * 
 * Params: { id: string }
 * Returns: 204 No Content on success
 */
export async function deleteTradingSignal(req: AuthenticatedRequest, res: Response) {
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

    // Check if signal exists and belongs to the authenticated user
    const existingSignal = await prisma.tradingSignal.findFirst({
      where: { id: signalId, userId: req.user.id },
    });

    if (!existingSignal) {
      return res.status(404).json({
        error: 'Trading signal not found',
      });
    }

    // Delete trading signal
    await prisma.tradingSignal.delete({
      where: { id: signalId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete trading signal error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

