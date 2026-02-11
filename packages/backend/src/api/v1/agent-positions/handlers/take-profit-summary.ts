/**
 * Get take-profit summary endpoint
 * 
 * GET /api/v1/agent-positions/:agentId/take-profit-summary
 * 
 * Returns a summary of take-profit activity for an agent.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { positionService } from '@/domain/trading/position-service.js';
import type { TakeProfitSummaryResponse } from '@nexgent/shared';

/**
 * Get take-profit summary for an agent
 * 
 * Params: { agentId: string }
 * Query: { includePositions?: boolean } - Include detailed position breakdown
 * Returns: TakeProfitSummaryResponse
 */
export async function getTakeProfitSummary(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { agentId } = req.params;
    const includePositions = req.query.includePositions === 'true';

    // Validate agent ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Verify agent belongs to authenticated user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id,
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

    // Get take-profit summary
    const summary = await positionService.getTakeProfitSummary(agentId);

    const response: TakeProfitSummaryResponse = {
      totalPositions: summary.totalPositions,
      positionsWithTakeProfitHit: summary.positionsWithTakeProfitHit,
      activeMoonBags: summary.activeMoonBags,
      totalLevelsHit: summary.totalLevelsHit,
    };

    // Include detailed position breakdown if requested
    if (includePositions) {
      const positionsWithActivity = await positionService.getPositionsWithTakeProfitActivity(agentId);
      
      response.positions = positionsWithActivity.map(position => {
        const remainingAmount = position.remainingAmount ?? position.purchaseAmount;
        const remainingPercent = position.purchaseAmount > 0
          ? (remainingAmount / position.purchaseAmount) * 100
          : 100;

        return {
          id: position.id,
          tokenSymbol: position.tokenSymbol,
          levelsHit: position.takeProfitLevelsHit,
          remainingPercent,
          moonBagActivated: position.moonBagActivated,
          lastTakeProfitTime: position.lastTakeProfitTime,
        };
      });
    }

    res.json(response);
  } catch (error) {
    console.error('Get take-profit summary error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
