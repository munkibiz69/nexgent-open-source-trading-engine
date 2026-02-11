/**
 * Delete agent historical swap endpoint
 * 
 * DELETE /api/agent-historical-swaps/:id
 * 
 * Deletes an agent historical swap.
 * Requires authentication. Users can only delete swaps for their own agents.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Delete an agent historical swap
 * 
 * Params: { id: string }
 * Returns: 204 No Content on success
 */
export async function deleteAgentHistoricalSwap(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Swap ID is required',
      });
    }

    // Check if swap exists and belongs to user's agent
    const existingSwap = await prisma.agentHistoricalSwap.findUnique({
      where: { id },
      select: {
        agent: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingSwap) {
      return res.status(404).json({
        error: 'Historical swap not found',
      });
    }

    if (existingSwap.agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only delete swaps for your own agents',
      });
    }

    // Delete swap
    await prisma.agentHistoricalSwap.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete agent historical swap error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

