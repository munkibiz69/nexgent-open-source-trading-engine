/**
 * Delete agent balance endpoint
 * 
 * DELETE /api/agent-balances/:id
 * 
 * Deletes a balance.
 * Ensures the balance belongs to an agent owned by the authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Delete an agent balance
 * 
 * Params: { id: string }
 * Returns: { success: true }
 */
export async function deleteAgentBalance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid balance ID format',
      });
    }

    // Check if balance exists and belongs to an agent owned by the authenticated user
    const existingBalance = await prisma.agentBalance.findFirst({
      where: {
        id,
        agent: {
          userId: req.user.id, // Ensure user can only delete balances for their own agents
        },
      },
    });

    if (!existingBalance) {
      return res.status(404).json({
        error: 'Balance not found',
      });
    }

    // Delete balance
    await prisma.agentBalance.delete({
      where: {
        id,
      },
    });

    res.json({
      success: true,
      message: 'Balance deleted successfully',
    });
  } catch (error) {
    console.error('Delete agent balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

