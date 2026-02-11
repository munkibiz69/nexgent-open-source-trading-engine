import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { prisma } from '@/infrastructure/database/client.js';
import { performanceService } from '@/domain/performance/performance.service.js';

export async function getAgentPerformance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { agentId } = req.params;
    const timeframe = (req.query.timeframe as '24h' | 'all') || 'all';
    const walletAddress = req.query.walletAddress as string | undefined;

    // Validate timeframe
    if (timeframe !== '24h' && timeframe !== 'all') {
      return res.status(400).json({ error: "Invalid timeframe. Must be '24h' or 'all'" });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return res.status(400).json({ error: 'Invalid agent ID format' });
    }

    // Verify agent belongs to user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id,
      },
      select: { id: true },
    });

    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    // Get performance metrics (optionally filtered by wallet for trading mode)
    const performance = await performanceService.getAgentPerformance(agentId, timeframe, walletAddress);

    return res.json(performance);
  } catch (error) {
    console.error('[API] Error fetching agent performance:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

