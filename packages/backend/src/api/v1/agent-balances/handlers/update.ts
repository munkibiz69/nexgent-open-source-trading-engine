/**
 * Update agent balance endpoint
 * 
 * PUT /api/agent-balances/:id
 * 
 * Updates an existing balance.
 * Ensures the balance belongs to an agent owned by the authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { UpdateAgentBalanceRequest, AgentBalanceResponse } from '../types.js';

/**
 * Update an existing agent balance
 * 
 * Params: { id: string }
 * Body: { balance?: string, tokenSymbol?: string }
 * Returns: { id, agentId, tokenAddress, tokenSymbol, balance, lastUpdated }
 */
export async function updateAgentBalance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;
    const { balance, tokenSymbol }: UpdateAgentBalanceRequest = req.body;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid balance ID format',
      });
    }

    // Validate that at least one field is being updated
    if (balance === undefined && tokenSymbol === undefined) {
      return res.status(400).json({
        error: 'At least one field (balance or tokenSymbol) must be provided',
      });
    }

    // Validate balance if provided
    if (balance !== undefined) {
      if (typeof balance !== 'string' || balance.trim().length === 0) {
        return res.status(400).json({
          error: 'Balance must be a non-empty string',
        });
      }

      // Validate balance is a valid number string
      if (!/^-?\d+(\.\d+)?$/.test(balance.trim())) {
        return res.status(400).json({
          error: 'Balance must be a valid number string',
        });
      }
    }

    // Validate tokenSymbol if provided
    if (tokenSymbol !== undefined) {
      if (typeof tokenSymbol !== 'string' || tokenSymbol.trim().length === 0) {
        return res.status(400).json({
          error: 'Token symbol must be a non-empty string',
        });
      }

      if (tokenSymbol.length > 20) {
        return res.status(400).json({
          error: 'Token symbol must be 20 characters or less',
        });
      }
    }

    // Check if balance exists and belongs to an agent owned by the authenticated user
    const existingBalance = await prisma.agentBalance.findFirst({
      where: {
        id,
        agent: {
          userId: req.user.id, // Ensure user can only update balances for their own agents
        },
      },
    });

    if (!existingBalance) {
      return res.status(404).json({
        error: 'Balance not found',
      });
    }

    // Update balance
    const updatedBalance = await prisma.agentBalance.update({
      where: {
        id,
      },
      data: {
        ...(balance !== undefined && { balance: balance.trim() }),
        ...(tokenSymbol !== undefined && { tokenSymbol: tokenSymbol.trim() }),
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

    const response: AgentBalanceResponse = {
      id: updatedBalance.id,
      agentId: updatedBalance.agentId,
      walletAddress: updatedBalance.walletAddress,
      tokenAddress: updatedBalance.tokenAddress,
      tokenSymbol: updatedBalance.tokenSymbol,
      balance: updatedBalance.balance,
      lastUpdated: updatedBalance.lastUpdated,
    };

    res.json(response);
  } catch (error) {
    console.error('Update agent balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

