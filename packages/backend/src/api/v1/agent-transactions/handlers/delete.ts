/**
 * Delete agent transaction endpoint
 * 
 * DELETE /api/agent-transactions/:id
 * 
 * Deletes an agent transaction.
 * Requires authentication. Users can only delete transactions for their own agents.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Delete an agent transaction
 * 
 * Params: { id: string }
 * Returns: 204 No Content on success
 */
export async function deleteAgentTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Transaction ID is required',
      });
    }

    // Check if transaction exists and belongs to user's agent
    const existingTransaction = await prisma.agentTransaction.findUnique({
      where: { id },
      select: {
        agent: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!existingTransaction) {
      return res.status(404).json({
        error: 'Transaction not found',
      });
    }

    if (existingTransaction.agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only delete transactions for your own agents',
      });
    }

    // Delete transaction
    await prisma.agentTransaction.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete agent transaction error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

