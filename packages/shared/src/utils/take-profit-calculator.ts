/**
 * Take-Profit Calculator Utilities
 * 
 * Shared calculation functions for take-profit percentages and amounts.
 * Used by both frontend (visualization) and backend (take-profit evaluation).
 * 
 * All functions are pure (no side effects) and deterministic.
 */

import type { TakeProfitConfig, TakeProfitLevel, MoonBagConfig } from '../types/trading-config.js';

/**
 * Result of evaluating take-profit levels
 */
export interface TakeProfitEvaluationResult {
  /** Whether any take-profit levels should be executed */
  shouldExecute: boolean;
  
  /** Levels that should be executed (may be multiple if price jumped) */
  levelsToExecute: TakeProfitLevel[];
  
  /** Total sell amount in tokens */
  sellAmount: number;
  
  /** Whether moon bag should be activated this evaluation */
  activateMoonBag: boolean;
  
  /** Amount to set aside as moon bag (if activating) */
  moonBagAmount: number;
  
  /** New remaining amount after this sale */
  newRemainingAmount: number;
  
  /** Human-readable reason for the evaluation result */
  reason: string;
}

/**
 * Calculate gain percentage from purchase price
 * 
 * @param purchasePrice - Original purchase price
 * @param currentPrice - Current market price
 * @returns Percentage gain (positive) or loss (negative)
 */
export function calculateGainPercent(purchasePrice: number, currentPrice: number): number {
  if (purchasePrice <= 0) {
    return 0;
  }
  return ((currentPrice - purchasePrice) / purchasePrice) * 100;
}

/**
 * Find take-profit levels that should be triggered
 * 
 * Checks which levels have been hit based on current gain percentage,
 * excluding levels that have already been executed.
 * 
 * @param gainPercent - Current gain percentage from entry
 * @param levels - Configured take-profit levels (should be sorted by targetPercent ascending)
 * @param levelsHit - Number of levels already executed
 * @returns Array of levels to execute
 */
export function findTriggeredLevels(
  gainPercent: number,
  levels: TakeProfitLevel[],
  levelsHit: number
): TakeProfitLevel[] {
  const triggeredLevels: TakeProfitLevel[] = [];
  
  // Start from the next level that hasn't been hit yet
  for (let i = levelsHit; i < levels.length; i++) {
    const level = levels[i];
    if (gainPercent >= level.targetPercent) {
      triggeredLevels.push(level);
    } else {
      // Levels are sorted ascending, so if this one isn't triggered,
      // none of the remaining ones will be either
      break;
    }
  }
  
  return triggeredLevels;
}

/**
 * Calculate the total sell percentage from an array of levels
 * 
 * @param levels - Array of take-profit levels
 * @returns Sum of all sellPercent values
 */
export function calculateTotalSellPercent(levels: TakeProfitLevel[]): number {
  return levels.reduce((sum, level) => sum + level.sellPercent, 0);
}

/**
 * Check if moon bag should be activated
 * 
 * Moon bag is activated when:
 * 1. Moon bag is enabled in config
 * 2. Moon bag hasn't been activated yet
 * 3. Either:
 *    a. Current gain has reached the trigger threshold, OR
 *    b. We're about to hit the final take-profit level
 * 
 * @param config - Moon bag configuration
 * @param currentGainPercent - Current gain percentage
 * @param isApproachingFinalLevel - Whether we're about to execute the final TP level
 * @param alreadyActivated - Whether moon bag was already activated
 * @returns Whether to activate moon bag now
 */
export function shouldActivateMoonBag(
  config: MoonBagConfig,
  currentGainPercent: number,
  isApproachingFinalLevel: boolean,
  alreadyActivated: boolean
): boolean {
  if (!config.enabled || alreadyActivated) {
    return false;
  }
  
  // Activate if we've hit the trigger threshold OR we're about to hit the final level
  return currentGainPercent >= config.triggerPercent || isApproachingFinalLevel;
}

/**
 * Calculate sell amount for take-profit execution
 * 
 * Each level's sell amount is calculated from the ORIGINAL position amount,
 * not from the remaining amount. This ensures predictable sell amounts.
 * 
 * @param originalAmount - Original position amount (tokens)
 * @param levels - Levels to execute
 * @returns Total tokens to sell
 */
export function calculateSellAmount(
  originalAmount: number,
  levels: TakeProfitLevel[]
): number {
  const totalSellPercent = calculateTotalSellPercent(levels);
  return (originalAmount * totalSellPercent) / 100;
}

/**
 * Calculate moon bag amount
 * 
 * @param originalAmount - Original position amount (tokens)
 * @param retainPercent - Percentage to retain as moon bag
 * @returns Tokens to set aside as moon bag
 */
export function calculateMoonBagAmount(
  originalAmount: number,
  retainPercent: number
): number {
  return (originalAmount * retainPercent) / 100;
}

/**
 * Main evaluation function: Evaluate take-profit for a position
 * 
 * This is the primary function used by the backend take-profit manager.
 * Determines if take-profit should be executed and calculates all amounts.
 * 
 * @param params - Evaluation parameters
 * @returns Evaluation result with sell amounts and moon bag status
 */
export function evaluateTakeProfit(params: {
  /** Current market price */
  currentPrice: number;
  /** Original purchase price (or DCA'd average) */
  purchasePrice: number;
  /** Original position amount in tokens */
  originalAmount: number;
  /** Current remaining amount (null = full originalAmount) */
  remainingAmount: number | null;
  /** Number of TP levels already executed */
  levelsHit: number;
  /** Whether moon bag has already been activated */
  moonBagActivated: boolean;
  /** Current moon bag amount (if already activated) */
  currentMoonBagAmount: number | null;
  /** Take-profit configuration */
  config: TakeProfitConfig;
  /** TP level at which current batch started (for append-levels model, default 0) */
  tpBatchStartLevel?: number;
  /** Total TP levels including appended batches (null = use config.levels.length) */
  totalTakeProfitLevels?: number | null;
}): TakeProfitEvaluationResult {
  const {
    currentPrice,
    purchasePrice,
    originalAmount,
    remainingAmount,
    levelsHit,
    moonBagActivated,
    currentMoonBagAmount,
    config,
    tpBatchStartLevel = 0,
    totalTakeProfitLevels,
  } = params;
  
  // Effective total levels: use stored value if set, otherwise config levels length
  const effectiveTotalLevels = totalTakeProfitLevels ?? config.levels.length;
  
  // Default result for no execution
  const noExecuteResult: TakeProfitEvaluationResult = {
    shouldExecute: false,
    levelsToExecute: [],
    sellAmount: 0,
    activateMoonBag: false,
    moonBagAmount: 0,
    newRemainingAmount: remainingAmount ?? originalAmount,
    reason: '',
  };
  
  // Check if take-profit is enabled
  if (!config.enabled) {
    return { ...noExecuteResult, reason: 'Take-profit disabled' };
  }
  
  // Check if all levels exhausted (use effectiveTotalLevels for append-levels model)
  if (levelsHit >= effectiveTotalLevels) {
    return { ...noExecuteResult, reason: 'All take-profit levels exhausted' };
  }
  
  // Calculate current gain percentage
  const gainPercent = calculateGainPercent(purchasePrice, currentPrice);
  
  // Calculate level index within current batch
  // For append-levels model: levelIndex = levelsHit - tpBatchStartLevel
  // This maps levelsHit back to config.levels[0..n] for the current batch
  const batchLevelIndex = levelsHit - tpBatchStartLevel;
  
  // Find levels that should be triggered (using batch-relative index)
  const levelsToExecute = findTriggeredLevels(gainPercent, config.levels, batchLevelIndex);
  
  if (levelsToExecute.length === 0) {
    const nextLevel = config.levels[batchLevelIndex];
    if (!nextLevel) {
      return { ...noExecuteResult, reason: 'No more levels in current batch' };
    }
    return {
      ...noExecuteResult,
      reason: `Current gain ${gainPercent.toFixed(2)}% below next level ${nextLevel.targetPercent}%`,
    };
  }
  
  // Check if we're approaching the final level (in the context of total levels)
  const isApproachingFinalLevel = (levelsHit + levelsToExecute.length) >= effectiveTotalLevels;
  
  // Check if moon bag should be activated
  const shouldActivate = shouldActivateMoonBag(
    config.moonBag,
    gainPercent,
    isApproachingFinalLevel,
    moonBagActivated
  );
  
  // Calculate moon bag amount (if activating or already activated)
  let moonBagReserve = 0;
  let newMoonBagAmount = 0;
  
  if (shouldActivate) {
    newMoonBagAmount = calculateMoonBagAmount(originalAmount, config.moonBag.retainPercent);
    moonBagReserve = newMoonBagAmount;
  } else if (moonBagActivated && currentMoonBagAmount) {
    moonBagReserve = currentMoonBagAmount;
  }
  
  // Calculate sell amount from ORIGINAL position
  const rawSellAmount = calculateSellAmount(originalAmount, levelsToExecute);
  
  // Calculate available to sell (remaining minus moon bag reserve)
  const currentRemaining = remainingAmount ?? originalAmount;
  const availableToSell = Math.max(0, currentRemaining - moonBagReserve);
  
  // Cap sell amount at available
  const actualSellAmount = Math.min(rawSellAmount, availableToSell);
  
  if (actualSellAmount <= 0) {
    return {
      ...noExecuteResult,
      activateMoonBag: shouldActivate,
      moonBagAmount: newMoonBagAmount,
      reason: 'No tokens available to sell (only moon bag remains)',
    };
  }
  
  // Calculate new remaining amount
  const newRemainingAmount = currentRemaining - actualSellAmount;
  
  return {
    shouldExecute: true,
    levelsToExecute,
    sellAmount: actualSellAmount,
    activateMoonBag: shouldActivate,
    moonBagAmount: newMoonBagAmount,
    newRemainingAmount,
    reason: `Triggered ${levelsToExecute.length} level(s) at ${gainPercent.toFixed(2)}% gain`,
  };
}

/**
 * Normalize take-profit levels by sorting ascending by targetPercent
 * 
 * @param levels - Array of take-profit levels
 * @returns Sorted array (new array, doesn't mutate input)
 */
export function normalizeTakeProfitLevels(levels: TakeProfitLevel[]): TakeProfitLevel[] {
  return [...levels].sort((a, b) => a.targetPercent - b.targetPercent);
}

/**
 * Validate take-profit configuration
 * 
 * Checks that total allocation doesn't exceed 100%
 * 
 * @param config - Take-profit configuration
 * @returns Validation result with any errors
 */
export function validateTakeProfitAllocation(config: TakeProfitConfig): {
  valid: boolean;
  totalSellPercent: number;
  moonBagPercent: number;
  totalAllocation: number;
  error?: string;
} {
  const totalSellPercent = calculateTotalSellPercent(config.levels);
  const moonBagPercent = config.moonBag.enabled ? config.moonBag.retainPercent : 0;
  const totalAllocation = totalSellPercent + moonBagPercent;
  
  if (totalAllocation > 100) {
    return {
      valid: false,
      totalSellPercent,
      moonBagPercent,
      totalAllocation,
      error: `Total allocation ${totalAllocation}% exceeds 100%`,
    };
  }
  
  return {
    valid: true,
    totalSellPercent,
    moonBagPercent,
    totalAllocation,
  };
}
