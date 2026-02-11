/**
 * Unassign wallet endpoint
 *
 * POST /api/wallets/:walletAddress/unassign
 *
 * Unassigns a live wallet from an agent by:
 * - Clearing all transaction history, positions, balances from the database
 * - Removing the wallet assignment so a new wallet can be assigned
 *
 * Only available for live wallets. Simulation wallets are auto-managed.
 * The actual on-chain wallet and its funds are not affected.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { walletResetService, WalletResetError } from '@/domain/wallets/wallet-reset-service.js';

/**
 * Unassign wallet response
 */
export interface UnassignWalletResponse {
  success: boolean;
  message: string;
  walletAddress: string;
  deleted: {
    positions: number;
    historicalSwaps: number;
    balances: number;
    transactions: number;
  };
  duration: number;
}

/**
 * Unassign a live wallet from an agent
 *
 * Params: { walletAddress: string }
 * Body: { confirm: true } (required for safety)
 * Returns: UnassignWalletResponse
 */
export async function unassignWallet(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { walletAddress } = req.params;
    const { confirm } = req.body || {};

    // Validate input
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Wallet address is required',
      });
    }

    // Require explicit confirmation
    if (confirm !== true) {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'This is a destructive operation. Please include { "confirm": true } in the request body.',
      });
    }

    // Reject simulation wallets - only live wallets can be unassigned
    if (walletAddress.startsWith('sim_')) {
      return res.status(400).json({
        error: 'Cannot unassign simulation wallets. Simulation wallets are automatically managed.',
      });
    }

    // Verify wallet ownership and get agentId
    let walletInfo;
    try {
      walletInfo = await walletResetService.verifyWalletOwnership(
        walletAddress,
        req.user.id
      );
    } catch (error) {
      if (error instanceof WalletResetError && error.code === 'WALLET_NOT_FOUND') {
        return res.status(404).json({
          error: 'Wallet not found',
        });
      }
      throw error;
    }

    // Verify this is a live wallet
    const wallet = await prisma.agentWallet.findUnique({
      where: { walletAddress },
    });

    if (!wallet || wallet.walletType !== 'live') {
      return res.status(400).json({
        error: 'Only live wallets can be unassigned',
      });
    }

    const startTime = Date.now();

    // Step 1: Reset all trading data (positions, balances, transactions, etc.)
    const result = await walletResetService.resetWallet(
      walletInfo.walletAddress,
      walletInfo.agentId
    );

    // Step 2: Delete the wallet assignment
    await prisma.agentWallet.delete({
      where: { walletAddress },
    });

    const duration = Date.now() - startTime;

    const response: UnassignWalletResponse = {
      success: true,
      message: 'Wallet unassigned successfully. You can now assign a new wallet.',
      walletAddress,
      deleted: result.deleted,
      duration,
    };

    console.log(`🔄 Wallet unassigned for ${walletAddress}:`, {
      positions: result.deleted.positions,
      swaps: result.deleted.historicalSwaps,
      balances: result.deleted.balances,
      transactions: result.deleted.transactions,
      duration: `${duration}ms`,
    });

    res.json(response);
  } catch (error) {
    console.error('Unassign wallet error:', error);

    if (error instanceof WalletResetError) {
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
