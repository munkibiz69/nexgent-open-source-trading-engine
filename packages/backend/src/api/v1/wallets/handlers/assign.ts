/**
 * Assign wallet endpoint
 * 
 * POST /api/wallets/assign
 * 
 * Assigns a wallet from environment variables to an agent.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { walletStore } from '@/infrastructure/wallets/index.js';

/**
 * Assign wallet request body
 */
interface AssignWalletRequest {
  agentId: string;
  walletAddress: string;
  walletType: 'simulation' | 'live';
}

/**
 * Assign wallet to agent
 * 
 * Body: { agentId: string, walletAddress: string, walletType: 'simulation' | 'live' }
 * Returns: { success: true, walletAddress, walletType }
 */
export async function assignWallet(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { agentId, walletAddress, walletType }: AssignWalletRequest = req.body;

    // Validate input
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Wallet address is required',
      });
    }

    if (!walletType || (walletType !== 'simulation' && walletType !== 'live')) {
      return res.status(400).json({
        error: "Wallet type must be either 'simulation' or 'live'",
      });
    }

    // Validate UUID format for agentId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(agentId)) {
      return res.status(400).json({
        error: 'Invalid agent ID format',
      });
    }

    // Verify agent belongs to the authenticated user
    const agent = await prisma.agent.findFirst({
      where: {
        id: agentId,
        userId: req.user.id,
      },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    // Prevent assigning simulation addresses (sim_ prefix) as live wallets
    if (walletAddress.startsWith('sim_')) {
      if (walletType === 'live') {
        return res.status(400).json({
          error: 'Cannot assign simulation wallet address as live wallet. Simulation addresses (sim_*) are not valid on-chain addresses.',
        });
      }
      // For simulation type, this is expected - allow it
    }

    // For live wallets, verify wallet is loaded from environment
    if (walletType === 'live') {
      if (!walletStore.isWalletAvailable(walletAddress)) {
        return res.status(400).json({
          error: `Wallet ${walletAddress} is not loaded from environment variables. Please configure WALLET_1, WALLET_2, etc.`,
        });
      }
    }

    // Check if wallet already exists for this agent and type
    const existingWallet = await prisma.agentWallet.findFirst({
      where: {
        agentId,
        walletType,
      },
    });

    if (existingWallet) {
      // Update existing wallet (using walletAddress as primary key)
      await prisma.agentWallet.update({
        where: {
          walletAddress: existingWallet.walletAddress,
        },
        data: {
          walletAddress,
        },
      });

      return res.json({
        success: true,
        walletAddress,
        walletType,
        message: 'Wallet assignment updated',
      });
    }

    // Create new wallet assignment
    await prisma.agentWallet.create({
      data: {
        agentId,
        walletAddress,
        walletType,
      },
    });

    res.status(201).json({
      success: true,
      walletAddress,
      walletType,
      message: 'Wallet assigned successfully',
    });
  } catch (error) {
    console.error('Assign wallet error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

