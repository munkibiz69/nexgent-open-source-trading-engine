/**
 * Create agent balance endpoint
 * 
 * POST /api/agent-balances
 * 
 * Creates a new balance record for an agent.
 * Ensures the agent belongs to the authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { CreateAgentBalanceRequest, AgentBalanceResponse } from '../types.js';
import { getDefaultWalletForAgent, validateWalletBelongsToAgent } from '../../wallets/helpers.js';

/**
 * Create a new agent balance
 * 
 * Body: { agentId: string, tokenAddress: string, tokenSymbol: string, balance: string }
 * Returns: { id, agentId, tokenAddress, tokenSymbol, balance, lastUpdated }
 */
export async function createAgentBalance(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { agentId, walletAddress, tokenAddress, tokenSymbol, balance }: CreateAgentBalanceRequest = req.body;

    // Validate input
    if (!agentId || !tokenAddress || !tokenSymbol || balance === undefined) {
      return res.status(400).json({
        error: 'agentId, tokenAddress, tokenSymbol, and balance are required',
      });
    }

    // Validate agentId format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Validate tokenAddress
    if (typeof tokenAddress !== 'string' || tokenAddress.trim().length === 0) {
      return res.status(400).json({
        error: 'Token address must be a non-empty string',
      });
    }

    if (tokenAddress.length > 255) {
      return res.status(400).json({
        error: 'Token address must be 255 characters or less',
      });
    }

    // Validate tokenSymbol
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

    // Validate balance
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

    // Verify agent exists and belongs to the authenticated user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id, // Ensure user can only create balances for their own agents
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Determine walletAddress - use provided one or get default based on agent's trading mode
    let finalWalletAddress: string | null = walletAddress || null;
    if (!finalWalletAddress) {
      finalWalletAddress = await getDefaultWalletForAgent(agentId);
      if (!finalWalletAddress) {
        return res.status(400).json({
          error: 'No wallet found for agent. Please create a wallet first.',
        });
      }
    } else {
      // Validate that the provided walletAddress belongs to the agent
      const isValid = await validateWalletBelongsToAgent(finalWalletAddress, agentId);
      if (!isValid) {
        return res.status(400).json({
          error: 'Wallet does not belong to the specified agent',
        });
      }
    }

    // Check if balance already exists for this wallet and token (balances are per-wallet)
    const existingBalance = await prisma.agentBalance.findUnique({
      where: {
        walletAddress_tokenAddress: {
          walletAddress: finalWalletAddress,
          tokenAddress: tokenAddress.trim(),
        },
      },
    });

    if (existingBalance) {
      return res.status(409).json({
        error: 'Balance already exists for this wallet and token',
      });
    }

    // Create balance
    const agentBalance = await prisma.agentBalance.create({
      data: {
        agentId,
        walletAddress: finalWalletAddress,
        tokenAddress: tokenAddress.trim(),
        tokenSymbol: tokenSymbol.trim(),
        balance: balance.trim(),
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
      id: agentBalance.id,
      agentId: agentBalance.agentId,
      walletAddress: agentBalance.walletAddress,
      tokenAddress: agentBalance.tokenAddress,
      tokenSymbol: agentBalance.tokenSymbol,
      balance: agentBalance.balance,
      lastUpdated: agentBalance.lastUpdated,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create agent balance error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

