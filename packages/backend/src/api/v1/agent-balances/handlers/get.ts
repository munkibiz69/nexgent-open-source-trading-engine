/**
 * Get agent balance endpoint
 * 
 * GET /api/agent-balances/:id
 * 
 * Returns a specific balance by ID.
 * Ensures the balance belongs to an agent owned by the authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { AgentBalanceResponse } from '../types.js';

/**
 * Get a specific agent balance by ID
 * 
 * Params: { id: string }
 * Returns: { id, agentId, tokenAddress, tokenSymbol, balance, lastUpdated }
 */
export async function getAgentBalance(req: AuthenticatedRequest, res: Response) {
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

    // Get balance and verify it belongs to an agent owned by the authenticated user
    const balance = await prisma.agentBalance.findFirst({
      where: {
        id,
        agent: {
          userId: req.user.id, // Ensure user can only access balances for their own agents
        },
      },
      select: {
        id: true,
        agentId: true,
        walletAddress: true,
        tokenAddress: true,
        tokenSymbol: true,
        balance: true,
        lastUpdated: true,
      },
    });

    if (!balance) {
      return res.status(404).json({
        error: 'Balance not found',
      });
    }

    const response: AgentBalanceResponse = {
      id: balance.id,
      agentId: balance.agentId,
      walletAddress: balance.walletAddress,
      tokenAddress: balance.tokenAddress,
      tokenSymbol: balance.tokenSymbol,
      balance: balance.balance,
      lastUpdated: balance.lastUpdated,
    };

    res.json(response);
  } catch (error) {
    console.error('Get agent balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

