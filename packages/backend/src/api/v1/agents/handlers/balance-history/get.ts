import type { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { prisma } from '@/infrastructure/database/client.js';
import { BalanceSnapshotRepository } from '@/infrastructure/database/repositories/balance-snapshot.repository.js';

export async function getAgentBalanceHistory(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { id: agentId } = req.params;
    const timeframe = (req.query.timeframe as '24h' | 'all') || 'all';
    const walletAddress = req.query.walletAddress as string | undefined;

    // Validate walletAddress is provided
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({ error: 'walletAddress query parameter is required' });
    }

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

    // Verify wallet belongs to agent
    const wallet = await prisma.agentWallet.findFirst({
      where: {
        agentId,
        walletAddress,
      },
    });

    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found or access denied' });
    }

    // Get balance history from repository
    const repository = new BalanceSnapshotRepository();
    const snapshots = await repository.findByAgentAndTimeframe(agentId, walletAddress, timeframe);

    // Transform snapshots to response format
    const balanceHistory = snapshots.map((snapshot) => ({
      timestamp: snapshot.snapshotTimestamp.toISOString(),
      portfolioBalanceSol: snapshot.portfolioBalanceSol.toString(),
      solBalance: snapshot.solBalance.toString(),
      positionsValueSol: snapshot.positionsValueSol.toString(),
      unrealizedPnLSol: snapshot.unrealizedPnLSol.toString(),
    }));

    return res.json({
      agentId,
      timeframe,
      snapshots: balanceHistory,
    });
  } catch (error) {
    console.error('[API] Error fetching agent balance history:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
