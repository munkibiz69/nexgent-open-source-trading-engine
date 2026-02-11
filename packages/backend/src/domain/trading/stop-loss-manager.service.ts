/**
 * Stop Loss Manager Service
 * 
 * Manages trailing stop loss logic for open positions.
 * Handles stop loss evaluation for all modes (fixed, exponential, zones, custom).
 */

import { Decimal } from '@prisma/client/runtime/library';
import { configService } from './config-service.js';
import { positionService } from './position-service.js';
import { redisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { REDIS_KEYS, REDIS_TTL } from '@/shared/constants/redis-keys.js';
import { calculateStopLossPercentage } from '@nexgent/shared';
import type { AgentTradingConfig } from '@nexgent/shared';
import type { OpenPosition } from '@nexgent/shared';

/**
 * Result of a stop loss evaluation
 */
export interface StopLossEvaluationResult {
  shouldTrigger: boolean;
  currentStopLossPercentage: number | null;
  stopLossPrice: number | null;
  updated: boolean;
}

/**
 * Stop Loss Manager Service
 * 
 * Singleton service for managing stop loss logic.
 */
class StopLossManager {
  private static instance: StopLossManager;

  private constructor() {}

  public static getInstance(): StopLossManager {
    if (!StopLossManager.instance) {
      StopLossManager.instance = new StopLossManager();
    }
    return StopLossManager.instance;
  }

  /**
   * Initialize stop loss for a new position
   */
  async initializeStopLoss(
    positionId: string, 
    purchasePrice: number, 
    config: AgentTradingConfig
  ): Promise<number | undefined> {
    if (!config.stopLoss.enabled) {
      return undefined;
    }

    // Initial stop loss is the default percentage (usually negative, e.g. -32%)
    const initialStopLoss = config.stopLoss.defaultPercentage;

    // Update position with initial state
    await positionService.updatePosition(positionId, {
      currentStopLossPercentage: initialStopLoss,
      peakPrice: purchasePrice, // Initial peak is purchase price
      lastStopLossUpdate: new Date(),
    });

    return initialStopLoss;
  }

  /**
   * Evaluate stop loss for a position
   * 
   * Checks if stop loss should be triggered based on current price.
   * Updates trailing stop loss if price has risen.
   * 
   * Optimized to use Redis for config lookups and avoid DB writes unless state changes.
   * 
   * @param position - Open position
   * @param currentPrice - Current token price in SOL per token
   * @param config - Trading configuration (optional, will fetch from Redis if not provided)
   * @returns Evaluation result
   */
  async evaluateStopLoss(
    position: OpenPosition,
    currentPrice: number,
    config?: AgentTradingConfig
  ): Promise<StopLossEvaluationResult> {
    // Acquire distributed lock to prevent concurrent evaluations for the same position
    const lockKey = REDIS_KEYS.LOCK(`stop-loss:${position.id}`);
    const lockToken = await redisService.acquireLock(lockKey, REDIS_TTL.LOCK);
    
    if (!lockToken) {
      // Another evaluation is in progress - skip this one to avoid race conditions
      // Return current state without updating
      return {
        shouldTrigger: false,
        currentStopLossPercentage: position.currentStopLossPercentage,
        stopLossPrice: null,
        updated: false,
      };
    }

    try {
      // Re-read position from DB after acquiring lock (ensures fresh data)
      // This prevents race conditions where position was updated by another process
      const freshPosition = await positionService.getPositionById(position.id);
      
      if (!freshPosition) {
        // Position was closed, skip evaluation
        return {
          shouldTrigger: false,
          currentStopLossPercentage: null,
          stopLossPrice: null,
          updated: false,
        };
      }

      // Use fresh position data for evaluation
      position = freshPosition;

      // 1. Load config from Redis if not provided
      if (!config) {
          config = await redisConfigService.getAgentConfig(position.agentId) || undefined;
          if (!config) {
              // Fallback to DB (should be rare with cache warming)
              config = await configService.loadAgentConfig(position.agentId);
          }
      }

      if (!config.stopLoss.enabled) {
        return {
          shouldTrigger: false,
          currentStopLossPercentage: null,
          stopLossPrice: null,
          updated: false,
        };
      }

    // Calculate price change from purchase price
    // const priceChangePercent = ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100;

    // Update peak price if current price is higher
    let peakPrice = position.peakPrice ?? position.purchasePrice;
    if (currentPrice > peakPrice) {
      peakPrice = currentPrice;
    }

    // Calculate peak change percent using Decimal for precision with very small numbers
    // This prevents Infinity from floating-point division with extremely small purchasePrice values
    const purchasePriceDecimal = new Decimal(position.purchasePrice);
    const peakPriceDecimal = new Decimal(peakPrice);
    
    // Avoid division by zero or extremely small numbers that could cause Infinity
    if (purchasePriceDecimal.isZero() || purchasePriceDecimal.lt(1e-15)) {
      const logger = (await import('@/infrastructure/logging/logger.js')).default;
      logger.warn({
        positionId: position.id,
        agentId: position.agentId,
        tokenAddress: position.tokenAddress,
        purchasePrice: position.purchasePrice,
        currentPrice,
        peakPrice,
      }, 'Skipping stop loss evaluation: purchase price too small for safe calculation');
      
      return {
        shouldTrigger: false,
        currentStopLossPercentage: position.currentStopLossPercentage,
        stopLossPrice: null,
        updated: false,
      };
    }
    
    // Calculate using Decimal to maintain precision
    const peakChangeDecimal = peakPriceDecimal.minus(purchasePriceDecimal)
      .div(purchasePriceDecimal)
      .times(100);
    
    // Convert to number and validate it's finite
    const peakChangePercent = peakChangeDecimal.toNumber();
    
    if (!isFinite(peakChangePercent) || isNaN(peakChangePercent)) {
      const logger = (await import('@/infrastructure/logging/logger.js')).default;
      logger.warn({
        positionId: position.id,
        agentId: position.agentId,
        tokenAddress: position.tokenAddress,
        purchasePrice: position.purchasePrice,
        currentPrice,
        peakPrice,
        peakChangePercent,
      }, 'Skipping stop loss evaluation: peakChangePercent calculation produced Infinity or NaN');
      
      return {
        shouldTrigger: false,
        currentStopLossPercentage: position.currentStopLossPercentage,
        stopLossPrice: null,
        updated: false,
      };
    }
    
    // Recalculate target percentage based on PEAK performance
    let targetStopLossPercentage: number;
    if (peakChangePercent >= 0) {
        // Use shared calculator function - handles all modes (fixed, exponential, zones, custom)
        targetStopLossPercentage = calculateStopLossPercentage(peakChangePercent, config.stopLoss);
    } else {
        targetStopLossPercentage = config.stopLoss.defaultPercentage;
    }

    // Ensure monotonic increase (tightening)
    const currentStopLoss = position.currentStopLossPercentage ?? config.stopLoss.defaultPercentage;
    
    // Only update if new target is higher than current
    // For negative numbers: -10 > -32 (true), so it works for initial tightening too
    let newStopLossPercentage: number;
    if (targetStopLossPercentage > currentStopLoss) {
        newStopLossPercentage = targetStopLossPercentage;
    } else {
        newStopLossPercentage = currentStopLoss;
    }

    // Update peak price in position if it changed
    // Also update stop loss percentage if it changed
    const stopLossChanged = newStopLossPercentage !== position.currentStopLossPercentage;
    // Normalize peakPrice comparison: handle null and ensure numeric comparison
    const currentPeakPrice = position.peakPrice ?? null;
    const peakChanged = currentPeakPrice === null || Math.abs(peakPrice - currentPeakPrice) > 0.0001;
    
    const wasUpdated = stopLossChanged || peakChanged;

    // Calculate stop loss price
    let stopLossPrice: number | null = null;
    let shouldTrigger = false;

    if (newStopLossPercentage >= 0) {
      // Positive: trailing stop loss (gain-based)
      // Stop loss percentage is FROM PURCHASE PRICE, not from peak price
      // Stop loss price = purchasePrice * (1 + stopLossPercentage / 100)
      // E.g. Purchase = 100, Peak = 200, StopLoss% = 90 (90% from purchase) -> StopPrice = 100 * 1.90 = 190
      // E.g. Purchase = 100, Peak = 120, StopLoss% = 10 (10% from purchase) -> StopPrice = 100 * 1.10 = 110
      stopLossPrice = position.purchasePrice * (1 + newStopLossPercentage / 100);
      
      // Trigger if current price <= stop loss price
      shouldTrigger = currentPrice <= stopLossPrice;
    } else {
      // Negative: default stop loss (loss-based)
      // Stop loss price = purchasePrice * (1 + defaultPercentage / 100)
      // E.g. Purchase = 100, Default = -32 -> StopPrice = 100 * (1 - 0.32) = 68
      stopLossPrice = position.purchasePrice * (1 + newStopLossPercentage / 100);
      
      // Trigger if current price <= stop loss price
      shouldTrigger = currentPrice <= stopLossPrice;
    }

    // Helper to get calculation description based on mode
    const getCalculationDescription = (mode: string | undefined, stopLossPercent: number): string => {
      switch (mode) {
        case 'fixed':
          return 'fixed-stepper';
        case 'exponential':
          return 'exponential-decay';
        case 'zones':
          return 'zones';
        case 'custom':
          return stopLossPercent >= 0 ? 'trailing (peak-based)' : 'default (purchase-based)';
        default:
          return 'unknown';
      }
    };

    // Debug logging for stop loss evaluation
    const logger = (await import('@/infrastructure/logging/logger.js')).default;
    logger.debug({
      positionId: position.id,
      agentId: position.agentId,
      tokenAddress: position.tokenAddress,
      purchasePrice: position.purchasePrice,
      currentPrice,
      peakPrice,
      currentStopLossPercentage: position.currentStopLossPercentage,
      newStopLossPercentage,
      peakChangePercent,
      stopLossPrice,
      shouldTrigger,
      mode: config.stopLoss.mode || 'fixed',
      calculation: getCalculationDescription(config.stopLoss.mode, newStopLossPercentage),
    }, 'Stop loss evaluation');

    // Update position if changed (using Redis-first service)
    if (wasUpdated) {
      // Final validation: ensure all values are finite before updating database
      // This prevents Prisma errors from trying to save Infinity/NaN values
      if (!isFinite(newStopLossPercentage) || isNaN(newStopLossPercentage)) {
        const logger = (await import('@/infrastructure/logging/logger.js')).default;
        logger.error({
          positionId: position.id,
          agentId: position.agentId,
          tokenAddress: position.tokenAddress,
          newStopLossPercentage,
          targetStopLossPercentage,
          currentStopLoss,
        }, 'Cannot update position: newStopLossPercentage is not finite');
        return {
          shouldTrigger,
          currentStopLossPercentage: position.currentStopLossPercentage,
          stopLossPrice,
          updated: false,
        };
      }
      
      if (!isFinite(peakPrice) || isNaN(peakPrice) || peakPrice <= 0) {
        const logger = (await import('@/infrastructure/logging/logger.js')).default;
        logger.error({
          positionId: position.id,
          agentId: position.agentId,
          tokenAddress: position.tokenAddress,
          peakPrice,
          currentPrice,
          purchasePrice: position.purchasePrice,
        }, 'Cannot update position: peakPrice is not finite or invalid');
        return {
          shouldTrigger,
          currentStopLossPercentage: position.currentStopLossPercentage,
          stopLossPrice,
          updated: false,
        };
      }
      
      // Construct update payload
      const updateData = {
        currentStopLossPercentage: newStopLossPercentage,
        peakPrice: peakPrice,
        lastStopLossUpdate: new Date(),
      };
      
             // Update position using write-through pattern (DB first, then Redis)
      // We use positionService which now has Redis + Async DB
      await positionService.updatePosition(position.id, updateData);
    }

      return {
        shouldTrigger,
        currentStopLossPercentage: newStopLossPercentage,
        stopLossPrice,
        updated: wasUpdated,
      };
    } finally {
      // Always release the lock, even if an error occurred
      await redisService.releaseLock(lockKey, lockToken);
    }
  }

}

export const stopLossManager = StopLossManager.getInstance();
