/**
 * Take-Profit Manager Service
 * 
 * Manages partial take-profit logic for open positions.
 * Handles take-profit evaluation based on configured levels and moon bag settings.
 * 
 * DCA and Take-Profit can run concurrently. When DCA runs, it appends
 * fresh TP levels (append-levels model) using tpBatchStartLevel and totalTakeProfitLevels.
 */

import { Decimal } from '@prisma/client/runtime/library';
import { configService } from './config-service.js';
import { positionService } from './position-service.js';
import { redisConfigService } from '@/infrastructure/cache/redis-config-service.js';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { REDIS_KEYS, REDIS_TTL } from '@/shared/constants/redis-keys.js';
import { evaluateTakeProfit as evaluateTakeProfitCalc } from '@nexgent/shared';
import type { AgentTradingConfig, OpenPosition, TakeProfitLevel } from '@nexgent/shared';
import logger from '@/infrastructure/logging/logger.js';

/**
 * Result of a take-profit evaluation
 */
export interface TakeProfitEvaluationResult {
  /** Whether take-profit should be executed */
  shouldExecute: boolean;
  
  /** Levels that should be executed */
  levelsToExecute: TakeProfitLevel[];
  
  /** Amount of tokens to sell */
  sellAmount: number;
  
  /** Whether moon bag should be activated */
  activateMoonBag: boolean;
  
  /** Amount to set aside as moon bag */
  moonBagAmount: number;
  
  /** New remaining amount after this sale */
  newRemainingAmount: number;
  
  /** Human-readable reason for the evaluation result */
  reason: string;
  
  /** Current gain percentage */
  gainPercent: number;
}

/**
 * Take-Profit Manager Service
 * 
 * Singleton service for managing take-profit logic.
 */
class TakeProfitManager {
  private static instance: TakeProfitManager;

  private constructor() {}

  public static getInstance(): TakeProfitManager {
    if (!TakeProfitManager.instance) {
      TakeProfitManager.instance = new TakeProfitManager();
    }
    return TakeProfitManager.instance;
  }

  /**
   * Helper to convert Decimal or number to number
   */
  private toNumber(value: Decimal | number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    if (typeof value === 'number') {
      return value;
    }
    if (value instanceof Decimal) {
      return value.toNumber();
    }
    const num = typeof value === 'string' ? parseFloat(value) : Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Evaluate take-profit for a position
   * 
   * Checks if take-profit should be triggered based on current price.
   * Handles multiple levels being triggered at once (if price jumped).
   * 
   * @param position - Open position
   * @param currentPrice - Current token price in SOL per token
   * @param config - Trading configuration (optional, will fetch from Redis if not provided)
   * @returns Evaluation result
   */
  async evaluateTakeProfit(
    position: OpenPosition,
    currentPrice: number,
    config?: AgentTradingConfig
  ): Promise<TakeProfitEvaluationResult> {
    // Default result for no execution
    const noExecuteResult = (reason: string, gainPercent: number = 0): TakeProfitEvaluationResult => ({
      shouldExecute: false,
      levelsToExecute: [],
      sellAmount: 0,
      activateMoonBag: false,
      moonBagAmount: 0,
      newRemainingAmount: position.remainingAmount ?? position.purchaseAmount,
      reason,
      gainPercent,
    });

    // Acquire distributed lock to prevent concurrent evaluations for the same position
    const lockKey = REDIS_KEYS.LOCK(`take-profit:${position.id}`);
    const lockToken = await redisService.acquireLock(lockKey, REDIS_TTL.LOCK);
    
    if (!lockToken) {
      // Another evaluation is in progress - skip this one to avoid race conditions
      return noExecuteResult('Lock not acquired - another evaluation in progress');
    }

    try {
      // Re-read position from DB after acquiring lock (ensures fresh data)
      const freshPosition = await positionService.getPositionById(position.id);
      
      if (!freshPosition) {
        // Position was closed, skip evaluation
        return noExecuteResult('Position not found (may have been closed)');
      }

      // Use fresh position data for evaluation
      position = freshPosition;

      // Load config from Redis if not provided
      if (!config) {
        config = await redisConfigService.getAgentConfig(position.agentId) || undefined;
        if (!config) {
          // Fallback to DB (should be rare with cache warming)
          config = await configService.loadAgentConfig(position.agentId);
        }
      }

      // Check if take-profit is enabled
      if (!config.takeProfit?.enabled) {
        return noExecuteResult('Take-profit disabled');
      }

      // Validate position has required data
      if (!position.purchasePrice || position.purchasePrice <= 0) {
        return noExecuteResult('Invalid purchase price');
      }

      // Calculate gain percentage
      const gainPercent = ((currentPrice - position.purchasePrice) / position.purchasePrice) * 100;

      // Use shared calculator for evaluation
      // Pass tpBatchStartLevel and totalTakeProfitLevels for append-levels model
      const evaluation = evaluateTakeProfitCalc({
        currentPrice,
        purchasePrice: position.purchasePrice,
        originalAmount: position.purchaseAmount,
        remainingAmount: position.remainingAmount,
        levelsHit: position.takeProfitLevelsHit,
        moonBagActivated: position.moonBagActivated,
        currentMoonBagAmount: position.moonBagAmount,
        config: config.takeProfit,
        tpBatchStartLevel: position.tpBatchStartLevel,
        totalTakeProfitLevels: position.totalTakeProfitLevels,
      });

      // Log evaluation for debugging
      logger.debug({
        positionId: position.id,
        agentId: position.agentId,
        tokenSymbol: position.tokenSymbol,
        gainPercent: gainPercent.toFixed(2),
        levelsHit: position.takeProfitLevelsHit,
        totalLevels: config.takeProfit.levels.length,
        shouldExecute: evaluation.shouldExecute,
        activateMoonBag: evaluation.activateMoonBag,
        reason: evaluation.reason,
      }, 'Take-profit evaluation');

      return {
        ...evaluation,
        gainPercent,
      };
    } finally {
      // Always release the lock
      await redisService.releaseLock(lockKey, lockToken);
    }
  }

  /**
   * Get effective remaining amount for a position
   * 
   * Returns remainingAmount if set, otherwise purchaseAmount (full position).
   * 
   * @param position - Open position
   * @returns Effective remaining amount
   */
  getEffectiveRemainingAmount(position: OpenPosition): number {
    return position.remainingAmount ?? position.purchaseAmount;
  }

  /**
   * Check if position is only moon bag
   * 
   * Returns true if moon bag is activated and remaining equals moon bag amount.
   * 
   * @param position - Open position
   * @returns Whether position is only moon bag
   */
  isOnlyMoonBag(position: OpenPosition): boolean {
    if (!position.moonBagActivated || !position.moonBagAmount) {
      return false;
    }
    
    const remaining = this.getEffectiveRemainingAmount(position);
    // Allow small tolerance for floating point comparison
    return Math.abs(remaining - position.moonBagAmount) < 0.000001;
  }

  /**
   * Calculate progress through take-profit levels
   * 
   * @param position - Open position
   * @param config - Take-profit config
   * @returns Progress information
   */
  calculateProgress(position: OpenPosition, config: AgentTradingConfig): {
    levelsHit: number;
    totalLevels: number;
    percentComplete: number;
    soldAmount: number;
    remainingAmount: number;
    moonBagAmount: number | null;
  } {
    // Use stored totalTakeProfitLevels if set (append-levels model), otherwise config length
    const totalLevels = position.totalTakeProfitLevels ?? (config.takeProfit?.levels.length ?? 0);
    const levelsHit = position.takeProfitLevelsHit;
    const remainingAmount = this.getEffectiveRemainingAmount(position);
    const soldAmount = position.purchaseAmount - remainingAmount;
    
    return {
      levelsHit,
      totalLevels,
      percentComplete: totalLevels > 0 ? (levelsHit / totalLevels) * 100 : 0,
      soldAmount,
      remainingAmount,
      moonBagAmount: position.moonBagActivated ? position.moonBagAmount : null,
    };
  }
}

export const takeProfitManager = TakeProfitManager.getInstance();
