/**
 * Delete agent endpoint
 * 
 * DELETE /api/agents/:id
 * 
 * Deletes an agent (only if it belongs to the authenticated user).
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { agentService, AgentServiceError } from '@/domain/agents/agent-service.js';

/**
 * Delete an agent
 * 
 * Params: { id: string }
 * Returns: { success: true }
 */
export async function deleteAgent(req: AuthenticatedRequest, res: Response) {
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
        error: 'Invalid agent ID format',
      });
    }

    // Check if agent exists and belongs to the authenticated user
    const existingAgent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only delete their own agents
      },
    });

    if (!existingAgent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Delete agent (service handles DB delete and cache cleanup)
    await agentService.deleteAgent(id);

    res.json({
      success: true,
      message: 'Agent deleted successfully',
    });
  } catch (error) {
    console.error('Delete agent error:', error);
    
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

