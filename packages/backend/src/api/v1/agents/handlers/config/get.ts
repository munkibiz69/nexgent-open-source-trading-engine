/**
 * Get agent trading configuration endpoint
 * 
 * GET /api/agents/:id/config
 * 
 * Returns the complete trading configuration for an agent
 * (merged with defaults). Uses cache for performance.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import { configService } from '@/domain/trading/config-service.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { TradingConfigResponse } from './types.js';

/**
 * Get trading configuration for an agent
 * 
 * Params: { id: string }
 * Returns: { config: AgentTradingConfig }
 */
export async function getAgentTradingConfig(req: AuthenticatedRequest, res: Response) {
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

    // Verify agent exists and belongs to the authenticated user
    const agent = await prisma.agent.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only access their own agents
      },
      select: {
        id: true,
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Load configuration (uses cache, merges with defaults)
    const config = await configService.loadAgentConfig(id);

    const response: TradingConfigResponse = {
      config,
    };

    res.json(response);
  } catch (error) {
    console.error('Get agent trading config error:', error);
    
    // Handle config service errors
    if (error instanceof Error && error.name === 'ConfigServiceError') {
      return res.status(400).json({
        error: error.message,
        code: (error as { code?: string }).code,
      });
    }

    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

