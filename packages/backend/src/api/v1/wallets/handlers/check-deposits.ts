/**
 * Check Deposits Endpoint
 * 
 * POST /api/wallets/:walletAddress/check-deposits
 * 
 * Checks on-chain SOL balance and compares with database balance.
 * If a deposit is detected, creates a DEPOSIT transaction and updates balance.
 * 
 * This endpoint is for live wallets only.
 */

import { Response } from 'express';
import { Decimal } from '@prisma/client/runtime/library';
import { TransactionType } from '@prisma/client';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import { solanaBalanceService, SolanaBalanceServiceError } from '@/infrastructure/external/solana/index.js';
import { balanceService } from '@/domain/balances/balance-service.js';
import { redisBalanceService } from '@/infrastructure/cache/redis-balance-service.js';
import { redisPriceService } from '@/infrastructure/cache/redis-price-service.js';

/**
 * SOL token mint address
 */
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * Minimum deposit amount to detect (ignore dust)
 */
const MIN_DEPOSIT_AMOUNT = 0.00001; // 0.00001 SOL

/**
 * Check deposits request body
 */
interface CheckDepositsRequest {
  agentId: string;
}

/**
 * Check deposits response
 */
interface CheckDepositsResponse {
  success: boolean;
  depositDetected: boolean;
  previousBalance: number;
  onChainBalance: number;
  depositAmount: number | null;
  transactionId: string | null;
  message: string;
}

/**
 * Check for deposits to a live wallet
 * 
 * URL Params: { walletAddress: string }
 * Body: { agentId: string }
 * Returns: CheckDepositsResponse
 */
export async function checkDeposits(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { walletAddress } = req.params;
    const { agentId }: CheckDepositsRequest = req.body;

    // Validate required fields
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Wallet address is required',
      });
    }

    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    // Reject simulation wallet addresses (they start with sim_)
    if (walletAddress.startsWith('sim_')) {
      return res.status(400).json({
        error: 'Simulation wallets cannot check on-chain deposits. Use manual deposit instead.',
      });
    }

    // Verify the wallet exists and belongs to the user's agent
    const wallet = await prisma.agentWallet.findFirst({
      where: {
        walletAddress,
        agentId,
      },
      include: {
        agent: {
          select: {
            userId: true,
          },
        },
      },
    });

    if (!wallet) {
      return res.status(404).json({
        error: 'Wallet not found',
      });
    }

    // Verify the agent belongs to the authenticated user
    if (wallet.agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Wallet does not belong to your agent',
      });
    }

    // Verify this is a live wallet
    if (wallet.walletType !== 'live') {
      return res.status(400).json({
        error: 'Only live wallets can check for on-chain deposits',
      });
    }

    // Get current database balance for SOL
    let previousBalance = 0;
    const dbBalance = await prisma.agentBalance.findUnique({
      where: {
        walletAddress_tokenAddress: {
          walletAddress,
          tokenAddress: SOL_MINT_ADDRESS,
        },
      },
    });

    if (dbBalance) {
      previousBalance = parseFloat(dbBalance.balance);
    }

    // Get on-chain balance via Solana RPC
    let onChainBalance: number;
    try {
      const balanceResult = await solanaBalanceService.getOnChainBalance(walletAddress);
      onChainBalance = balanceResult.balanceSol;
    } catch (error) {
      if (error instanceof SolanaBalanceServiceError) {
        return res.status(500).json({
          error: `Failed to fetch on-chain balance: ${error.message}`,
          code: error.code,
        });
      }
      throw error;
    }

    // Calculate difference
    const difference = onChainBalance - previousBalance;

    // Check if deposit detected
    if (difference <= MIN_DEPOSIT_AMOUNT) {
      // No meaningful deposit detected
      const response: CheckDepositsResponse = {
        success: true,
        depositDetected: false,
        previousBalance,
        onChainBalance,
        depositAmount: null,
        transactionId: null,
        message: difference > 0 
          ? `Balance difference (${difference.toFixed(8)} SOL) is below minimum threshold` 
          : 'No new deposits detected. Balance is up to date.',
      };
      return res.json(response);
    }

    // Deposit detected! Create transaction and update balance
    console.log(`[CheckDeposits] 💰 Deposit detected for wallet ${walletAddress.slice(0, 8)}...: ${difference.toFixed(6)} SOL`);

    // Get SOL price for USD value calculation
    let solPrice = 0;
    try {
      const priceData = await redisPriceService.getPrice(SOL_MINT_ADDRESS);
      if (priceData) {
        solPrice = priceData.priceUsd;
      }
    } catch (_error) {
      console.warn('[CheckDeposits] ⚠️  Could not fetch SOL price for USD calculation');
    }

    const depositAmountDecimal = new Decimal(difference.toString());
    const transactionValueUsd = difference * solPrice;

    // Create deposit transaction and update balance atomically
    const transaction = await prisma.$transaction(async (tx) => {
      // Update balance via balance service
      await balanceService.updateBalancesFromTransaction(
        walletAddress,
        agentId,
        TransactionType.DEPOSIT,
        SOL_MINT_ADDRESS,
        'SOL',
        depositAmountDecimal,
        null, // No output token for deposits
        null,
        null,
        tx
      );

      // Create transaction record
      return await tx.agentTransaction.create({
        data: {
          agentId,
          walletAddress,
          transactionType: TransactionType.DEPOSIT,
          transactionValueUsd: new Decimal(transactionValueUsd.toString()),
          transactionTime: new Date(),
          inputMint: SOL_MINT_ADDRESS,
          inputSymbol: 'SOL',
          inputAmount: depositAmountDecimal,
          inputPrice: solPrice > 0 ? new Decimal(solPrice.toString()) : null,
        },
        select: {
          id: true,
        },
      });
    });

    // Update Redis cache for the balance
    try {
      const updatedBalance = await prisma.agentBalance.findUnique({
        where: {
          walletAddress_tokenAddress: {
            walletAddress,
            tokenAddress: SOL_MINT_ADDRESS,
          },
        },
      });

      if (updatedBalance) {
        await redisBalanceService.setBalance({
          id: updatedBalance.id,
          agentId: updatedBalance.agentId,
          walletAddress: updatedBalance.walletAddress,
          tokenAddress: updatedBalance.tokenAddress,
          tokenSymbol: updatedBalance.tokenSymbol,
          balance: updatedBalance.balance,
          lastUpdated: updatedBalance.lastUpdated,
        });
      }
    } catch (error) {
      // Log but don't fail - cache update is best-effort
      console.error('[CheckDeposits] ⚠️  Failed to update Redis cache:', error);
    }

    console.log(`[CheckDeposits] ✅ Created deposit transaction ${transaction.id} for ${difference.toFixed(6)} SOL`);

    const response: CheckDepositsResponse = {
      success: true,
      depositDetected: true,
      previousBalance,
      onChainBalance,
      depositAmount: difference,
      transactionId: transaction.id,
      message: `Deposit of ${difference.toFixed(4)} SOL detected and recorded.`,
    };

    return res.json(response);
  } catch (error) {
    console.error('[CheckDeposits] ❌ Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}

