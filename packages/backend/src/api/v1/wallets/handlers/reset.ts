/**
 * Reset wallet endpoint
 * 
 * POST /api/wallets/:walletAddress/reset
 * 
 * Resets all trading data for a wallet:
 * - Positions (open positions will be closed)
 * - Historical swaps
 * - Balances
 * - Transactions
 * 
 * This is a destructive operation that cannot be undone.
 * The wallet itself is preserved.
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { walletResetService, WalletResetError } from '@/domain/wallets/wallet-reset-service.js';

/**
 * Reset wallet response
 */
export interface ResetWalletResponse {
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
 * Reset a wallet's trading data
 * 
 * Params: { walletAddress: string }
 * Body: { confirm: true } (required for safety)
 * Returns: ResetWalletResponse
 */
export async function resetWallet(req: AuthenticatedRequest, res: Response) {
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

    // Verify wallet ownership
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

    // Execute reset
    const result = await walletResetService.resetWallet(
      walletInfo.walletAddress,
      walletInfo.agentId
    );

    const response: ResetWalletResponse = {
      success: true,
      message: 'Wallet trading data reset successfully',
      walletAddress,
      deleted: result.deleted,
      duration: result.duration,
    };

    console.log(`🔄 Wallet reset completed for ${walletAddress}:`, {
      positions: result.deleted.positions,
      swaps: result.deleted.historicalSwaps,
      balances: result.deleted.balances,
      transactions: result.deleted.transactions,
      duration: `${result.duration}ms`,
    });

    res.json(response);
  } catch (error) {
    console.error('Reset wallet error:', error);
    
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

