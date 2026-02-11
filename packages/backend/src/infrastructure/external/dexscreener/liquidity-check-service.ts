/**
 * Liquidity Check Service
 * 
 * Checks token liquidity using DexScreener API when price fetching fails.
 * Identifies rug pulled tokens (liquidity < $1,000 USD) and creates burn transactions.
 */

import { DexScreenerPriceProvider } from './dexscreener-price-provider.js';
import logger from '@/infrastructure/logging/logger.js';
import { Decimal } from '@prisma/client/runtime/library';
import { positionEventEmitter } from '@/domain/trading/position-events.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';

/**
 * Liquidity threshold for considering a token as "rug pulled"
 * 
 * We check the SOL (quote) liquidity, not USD liquidity, because:
 * - USD liquidity can be misleading when the base token is worthless
 * - Scammers drain SOL but leave worthless tokens behind
 * - This shows as "high USD liquidity" but actually the token is unsellable
 * 
 * If there's less than 10 SOL in the pool, it's considered rug pulled.
 */
const RUG_PULLED_SOL_LIQUIDITY_THRESHOLD = 10; // 10 SOL minimum

/**
 * SOL token mint address (for identifying SOL pairs)
 */
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * DexScreener API response structure
 */
interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
}

/**
 * Liquidity check result
 */
export interface LiquidityCheckResult {
  tokenAddress: string;
  hasLiquidity: boolean;
  liquidityUsd: number | null;
  liquiditySol: number | null; // SOL liquidity (quote) - more reliable indicator
  hasPairs: boolean;
  pairCount: number;
  isRugPulled: boolean; // true if SOL liquidity < 10 SOL or no SOL pairs
  error?: string;
}

/**
 * Liquidity Check Service
 * 
 * Checks token liquidity and handles rug pulled tokens by creating burn transactions
 */
export class LiquidityCheckService {
  private provider: DexScreenerPriceProvider;

  constructor() {
    this.provider = new DexScreenerPriceProvider();
  }

  /**
   * Check liquidity for a single token
   * 
   * @param tokenAddress - Token address to check
   * @returns Liquidity check result
   */
  async checkLiquidity(tokenAddress: string): Promise<LiquidityCheckResult> {
    try {
      // Fetch pairs directly to check SOL liquidity
      const pairs = await this.fetchTokenPairs(tokenAddress);
      
      // Filter to only SOL pairs (quoteToken is Wrapped SOL)
      const solPairs = pairs.filter(
        pair => pair.quoteToken.address.toLowerCase() === SOL_MINT_ADDRESS.toLowerCase()
      );
      
      // Find the pair with the highest SOL (quote) liquidity
      let maxSolLiquidity = 0;
      let maxUsdLiquidity = 0;
      for (const pair of solPairs) {
        const solLiquidity = pair.liquidity?.quote || 0;
        const usdLiquidity = pair.liquidity?.usd || 0;
        if (solLiquidity > maxSolLiquidity) {
          maxSolLiquidity = solLiquidity;
          maxUsdLiquidity = usdLiquidity;
        }
      }
      
      // Token is rug pulled if SOL liquidity is below threshold
      const isRugPulled = solPairs.length === 0 || maxSolLiquidity < RUG_PULLED_SOL_LIQUIDITY_THRESHOLD;
      
      return {
        tokenAddress: tokenAddress.toLowerCase(),
        hasLiquidity: maxSolLiquidity > 0,
        liquidityUsd: maxUsdLiquidity > 0 ? maxUsdLiquidity : null,
        liquiditySol: maxSolLiquidity > 0 ? maxSolLiquidity : null,
        hasPairs: solPairs.length > 0,
        pairCount: solPairs.length,
        isRugPulled,
        error: undefined,
      };
    } catch (error) {
      // Do not treat fetch/API errors as rug pull — we simply don't know. Only mark
      // rug pulled when we successfully fetched and liquidity is below threshold.
      return {
        tokenAddress: tokenAddress.toLowerCase(),
        hasLiquidity: false,
        liquidityUsd: null,
        liquiditySol: null,
        hasPairs: false,
        pairCount: 0,
        isRugPulled: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Check liquidity for multiple tokens using a single batch API call
   * 
   * This is more efficient than individual calls and avoids redundant API requests.
   * DexScreener supports up to 30 addresses per batch request.
   * 
   * @param tokenAddresses - Array of token addresses to check
   * @returns Array of liquidity check results
   */
  async checkLiquidityBatch(tokenAddresses: string[]): Promise<LiquidityCheckResult[]> {
    if (!tokenAddresses || tokenAddresses.length === 0) {
      return [];
    }
    
    const results: LiquidityCheckResult[] = [];
    const batchSize = 30; // DexScreener supports up to 30 addresses per request
    
    // Process in batches
    for (let i = 0; i < tokenAddresses.length; i += batchSize) {
      const batch = tokenAddresses.slice(i, i + batchSize);
      
      try {
        // Use single batch request instead of multiple individual calls
        const pairsByToken = await this.fetchTokenPairsBatch(batch);
        
        // Process results for each token in the batch
        for (const tokenAddress of batch) {
          const normalizedAddress = tokenAddress.toLowerCase();
          const pairs = pairsByToken.get(normalizedAddress) || [];
          
          // Filter to only SOL pairs (quoteToken is Wrapped SOL)
          const solPairs = pairs.filter(
            pair => pair.quoteToken.address.toLowerCase() === SOL_MINT_ADDRESS.toLowerCase()
          );
          
          // Find the pair with the highest SOL (quote) liquidity
          // This is more reliable than USD liquidity because scammers can drain SOL
          // but leave worthless tokens behind, inflating the USD value
          let maxSolLiquidity = 0;
          let maxUsdLiquidity = 0;
          for (const pair of solPairs) {
            const solLiquidity = pair.liquidity?.quote || 0;
            const usdLiquidity = pair.liquidity?.usd || 0;
            if (solLiquidity > maxSolLiquidity) {
              maxSolLiquidity = solLiquidity;
              maxUsdLiquidity = usdLiquidity;
            }
          }
          
          // Token is rug pulled if:
          // 1. No SOL pairs exist, OR
          // 2. SOL liquidity is below threshold (10 SOL)
          const isRugPulled = solPairs.length === 0 || maxSolLiquidity < RUG_PULLED_SOL_LIQUIDITY_THRESHOLD;
          
          results.push({
            tokenAddress: normalizedAddress,
            hasLiquidity: maxSolLiquidity > 0,
            liquidityUsd: maxUsdLiquidity > 0 ? maxUsdLiquidity : null,
            liquiditySol: maxSolLiquidity > 0 ? maxSolLiquidity : null,
            hasPairs: solPairs.length > 0,
            pairCount: solPairs.length,
            isRugPulled,
            error: undefined,
          });
        }
      } catch (error) {
        // Do not treat fetch/API errors as rug pull — we don't know. Skip burn logic.
        logger.warn({
          batchSize: batch.length,
          error: error instanceof Error ? error.message : String(error),
        }, 'Failed to fetch liquidity batch, skipping rug-pull check for this batch');
        
        for (const tokenAddress of batch) {
          results.push({
            tokenAddress: tokenAddress.toLowerCase(),
            hasLiquidity: false,
            liquidityUsd: null,
            liquiditySol: null,
            hasPairs: false,
            pairCount: 0,
            isRugPulled: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
      
      // Small delay between batches to be respectful of rate limits
      if (i + batchSize < tokenAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    return results;
  }
  
  /**
   * Fetch token pairs for multiple tokens in a single batch request
   * 
   * @param tokenAddresses - Array of token addresses
   * @returns Map of tokenAddress (lowercase) -> pairs array
   */
  private async fetchTokenPairsBatch(tokenAddresses: string[]): Promise<Map<string, DexScreenerPair[]>> {
    const addressesString = tokenAddresses.join(',');
    const url = `https://api.dexscreener.com/tokens/v1/solana/${addressesString}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const pairs: DexScreenerPair[] = Array.isArray(data) ? data : [];
    
    // Group pairs by base token address (lowercase)
    const pairsByToken = new Map<string, DexScreenerPair[]>();
    for (const pair of pairs) {
      const baseAddress = pair.baseToken.address.toLowerCase();
      if (!pairsByToken.has(baseAddress)) {
        pairsByToken.set(baseAddress, []);
      }
      pairsByToken.get(baseAddress)!.push(pair);
    }
    
    return pairsByToken;
  }

  /**
   * Fetch raw token pairs from DexScreener API
   * Used when price fetch fails to check if token has any pairs
   * 
   * @param tokenAddress - Token address to fetch pairs for
   * @returns Array of DexScreener pairs
   */
  private async fetchTokenPairs(tokenAddress: string): Promise<DexScreenerPair[]> {
    const url = `https://api.dexscreener.com/tokens/v1/solana/${tokenAddress}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`DexScreener API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Create burn transactions for all positions in a rug pulled token
   * 
   * Note: This method checks if burn transactions already exist to prevent duplicates.
   * Even if a burn transaction exists, the position is still deleted to prevent loops.
   * Uses a Redis lock to prevent concurrent processing of the same token.
   * 
   * @param tokenAddress - Token address that was identified as rug pulled
   */
  async createBurnTransactionsForRugPulledToken(tokenAddress: string): Promise<void> {
    const normalizedAddress = tokenAddress.toLowerCase();
    const lockKey = `burn_lock:${normalizedAddress}`;
    const lockTTL = 60; // 60 seconds lock TTL
    
    // Try to acquire distributed lock
    const client = redisService.getClient();
    const lockAcquired = await client.set(lockKey, '1', 'EX', lockTTL, 'NX');
    
    if (!lockAcquired) {
      logger.debug({ tokenAddress: normalizedAddress }, 'Skipping burn transaction - another process is handling this token');
      return;
    }
    
    try {
      const { positionService } = await import('@/domain/trading/position-service.js');
      const { prisma } = await import('@/infrastructure/database/client.js');
      const { balanceService } = await import('@/domain/balances/balance-service.js');
      
      // Get all active positions for this token
      const positions = await positionService.getPositionsByToken(tokenAddress);
      
      if (positions.length === 0) {
        logger.debug({ tokenAddress }, 'No active positions found for rug pulled token');
        return;
      }

      logger.info({
        tokenAddress,
        positionCount: positions.length,
      }, 'Creating burn transactions for rug pulled token positions');

      // Create burn transaction for each position
      for (const position of positions) {
        try {
          // Get wallet and purchase transaction for this position
          const positionRecord = await prisma.agentPosition.findUnique({
            where: { id: position.id },
            select: { 
              walletAddress: true, 
              agentId: true,
              purchaseTransactionId: true,
            },
          });

          if (!positionRecord) {
            logger.warn({ positionId: position.id, tokenAddress }, 'Position not found in database');
            continue;
          }

          // Get signalId from purchase transaction (if it exists)
          const purchaseTransaction = await prisma.agentTransaction.findUnique({
            where: { id: positionRecord.purchaseTransactionId },
            select: { signalId: true },
          });

          // Check if burn transaction already exists for this position
          const existingBurn = await prisma.agentTransaction.findFirst({
            where: {
              agentId: positionRecord.agentId,
              walletAddress: positionRecord.walletAddress,
              transactionType: 'BURN',
              inputMint: position.tokenAddress,
              transactionTime: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
              },
            },
          });

          if (existingBurn) {
            // Burn transaction exists, but we still need to delete the position
            // to prevent it from getting stuck in a loop
            try {
              // Clear Redis cache first
              const { redisPositionService } = await import('@/infrastructure/cache/redis-position-service.js');
              await redisPositionService.deletePosition({
                id: position.id,
                agentId: positionRecord.agentId,
                tokenAddress: position.tokenAddress,
              });
              
              // Then delete from database (use deleteMany to avoid throwing if already deleted)
              const deleteResult = await prisma.agentPosition.deleteMany({
                where: { id: position.id },
              });
              
              logger.info({
                positionId: position.id,
                tokenAddress,
                existingTransactionId: existingBurn.id,
                positionDeleted: deleteResult.count > 0,
              }, 'Burn transaction already exists, deleted position to prevent loop');
              
              // Emit position_closed event to notify PriceUpdateManager to stop tracking
              positionEventEmitter.emitPositionClosed({
                agentId: positionRecord.agentId,
                walletAddress: positionRecord.walletAddress,
                positionId: position.id,
                tokenAddress: position.tokenAddress,
              });
            } catch (deleteError) {
              logger.error({
                positionId: position.id,
                tokenAddress,
                error: deleteError instanceof Error ? deleteError.message : String(deleteError),
              }, 'Failed to delete position with existing burn transaction');
            }
            continue; // Skip creating new burn transaction
          }

          // Verify position still exists in database before processing
          // (It might have been deleted but still in Redis cache)
          const dbPositionCheck = await prisma.agentPosition.findUnique({
            where: { id: position.id },
            select: { id: true },
          });

          if (!dbPositionCheck) {
            // Position doesn't exist in DB but is in Redis cache - clear cache and skip
            logger.warn({
              positionId: position.id,
              tokenAddress,
            }, 'Position found in cache but not in database, clearing cache and skipping');
            
            try {
              const { redisPositionService } = await import('@/infrastructure/cache/redis-position-service.js');
              await redisPositionService.deletePosition({
                id: position.id,
                agentId: positionRecord.agentId,
                tokenAddress: position.tokenAddress,
              });
              
              // Emit position_closed event to clean up tracking for orphaned positions
              positionEventEmitter.emitPositionClosed({
                agentId: positionRecord.agentId,
                walletAddress: positionRecord.walletAddress,
                positionId: position.id,
                tokenAddress: position.tokenAddress,
              });
            } catch (cacheError) {
              logger.error({
                positionId: position.id,
                tokenAddress,
                error: cacheError instanceof Error ? cacheError.message : String(cacheError),
              }, 'Failed to clear Redis cache for orphaned position');
            }
            continue;
          }

          // Create burn transaction
          // Convert purchaseAmount from number to Decimal (needed for both transaction and balance service)
          // Ensure we have a valid amount
          if (!position.purchaseAmount || position.purchaseAmount <= 0) {
            logger.warn({
              positionId: position.id,
              tokenAddress,
              purchaseAmount: position.purchaseAmount,
            }, 'Position has invalid purchase amount, skipping burn transaction');
            continue;
          }
          
          const purchaseAmountDecimal = new Decimal(position.purchaseAmount);
          
          // Verify Decimal was created correctly
          if (!purchaseAmountDecimal || typeof purchaseAmountDecimal.lte !== 'function') {
            logger.error({
              positionId: position.id,
              tokenAddress,
              purchaseAmount: position.purchaseAmount,
              purchaseAmountType: typeof position.purchaseAmount,
            }, 'Failed to create Decimal from purchaseAmount');
            continue;
          }
          
          await prisma.$transaction(async (tx) => {
            // Create the burn transaction record
            const transaction = await tx.agentTransaction.create({
              data: {
                agent: { connect: { id: positionRecord.agentId } },
                wallet: { connect: { walletAddress: positionRecord.walletAddress } },
                transactionType: 'BURN',
                transactionValueUsd: new Decimal(0), // Worthless token
                transactionTime: new Date(),
                inputMint: position.tokenAddress,
                inputSymbol: position.tokenSymbol,
                inputAmount: purchaseAmountDecimal, // Burn all tokens (as Decimal)
                inputPrice: new Decimal(0), // Worthless
                fees: new Decimal(0),
                signal: purchaseTransaction?.signalId ? { connect: { id: purchaseTransaction.signalId } } : undefined,
              },
            });

            // Update balances (decrease token balance)
            // Pass the Decimal directly to balance service
            await balanceService.updateBalancesFromTransaction(
              positionRecord.walletAddress,
              positionRecord.agentId,
              'BURN',
              position.tokenAddress,
              position.tokenSymbol,
              purchaseAmountDecimal, // Decimal instance
              null, // No output for burn
              null,
              null,
              tx
            );

            // Close the position since tokens are burned
            // Use deleteMany to avoid throwing if record was already deleted (race condition)
            const deleteResult = await tx.agentPosition.deleteMany({
              where: { id: position.id },
            });

            logger.info({
              transactionId: transaction.id,
              positionId: position.id,
              agentId: positionRecord.agentId,
              walletAddress: positionRecord.walletAddress,
              tokenAddress: position.tokenAddress,
              amountBurned: position.purchaseAmount.toString(),
              positionDeleted: deleteResult.count > 0,
            }, 'Created burn transaction and closed position for rug pulled token');
            
            return { deleted: deleteResult.count > 0 };
          });
          
          // Clear Redis cache after transaction commits
          // This ensures DB is updated first, then cache is cleared
          try {
            const { redisPositionService } = await import('@/infrastructure/cache/redis-position-service.js');
            await redisPositionService.deletePosition({
              id: position.id,
              agentId: positionRecord.agentId,
              tokenAddress: position.tokenAddress,
            });
            logger.debug({
              positionId: position.id,
              tokenAddress,
            }, 'Cleared Redis cache for burned position');
          } catch (cacheError) {
            // Log but don't fail - cache will eventually be cleared or rebuilt
            logger.warn({
              positionId: position.id,
              tokenAddress,
              error: cacheError instanceof Error ? cacheError.message : String(cacheError),
            }, 'Failed to clear Redis cache for burned position (non-critical)');
          }
          
          // Emit position_closed event to notify PriceUpdateManager to stop tracking
          positionEventEmitter.emitPositionClosed({
            agentId: positionRecord.agentId,
            walletAddress: positionRecord.walletAddress,
            positionId: position.id,
            tokenAddress: position.tokenAddress,
          });
        } catch (error) {
          logger.error({
            positionId: position.id,
            tokenAddress,
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
          }, 'Failed to create burn transaction for position');
          // Continue with other positions
        }
      }
    } catch (error) {
      logger.error({
        tokenAddress,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, 'Failed to create burn transactions for rug pulled token');
    } finally {
      // Always release the lock
      await client.del(lockKey);
    }
  }
}

// Export singleton instance
export const liquidityCheckService = new LiquidityCheckService();

