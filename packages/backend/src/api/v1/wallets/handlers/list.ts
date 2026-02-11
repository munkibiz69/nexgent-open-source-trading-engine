/**
 * List wallets endpoint
 * 
 * GET /api/wallets/agent/:agentId
 * 
 * Returns both agent wallets and available wallets from environment variables.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { ListWalletsResponse, WalletListItem } from '../types.js';
import { walletStore } from '@/infrastructure/wallets/index.js';

/**
 * List all wallets for an agent and available wallets from environment
 * 
 * Params: { agentId: string }
 * Returns: { agentWallets: [...], availableWallets: [{ address: string }] }
 */
export async function listWallets(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { agentId } = req.params;

    // Validate UUID format
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

    // Get all wallets for this agent
    const wallets = await prisma.agentWallet.findMany({
      where: {
        agentId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Build agent wallets list with availability status
    const agentWallets: WalletListItem[] = wallets.map((wallet) => ({
      walletAddress: wallet.walletAddress,
      walletType: wallet.walletType as 'simulation' | 'live',
      isAvailable: wallet.walletType === 'live' 
        ? walletStore.isWalletAvailable(wallet.walletAddress)
        : true, // Simulation wallets are always "available" (no env var needed)
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    }));

    // Get available wallets from environment (for live wallets only)
    const availableWalletAddresses = walletStore.getAllWalletAddresses();
    const availableWallets = availableWalletAddresses.map((address) => ({
      walletAddress: address,
      isAssigned: wallets.some((w) => w.walletAddress === address),
    }));

    const response: ListWalletsResponse = {
      agentWallets,
      availableWallets,
    };

    res.json(response);
  } catch (error) {
    console.error('List wallets error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

