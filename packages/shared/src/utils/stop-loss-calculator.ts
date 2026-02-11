/**
 * Stop Loss Calculator Utilities
 * 
 * Shared calculation functions for stop loss percentages across different modes.
 * Used by both frontend (chart visualization) and backend (stop loss evaluation).
 * 
 * All functions are pure (no side effects) and deterministic.
 */

import type { StopLossConfig, StopLossMode, TrailingLevel } from '../types/trading-config.js';

/**
 * Calculate stop loss for Fixed Stepper mode
 * Formula: stopLoss = change - 10 (with 0% minimum)
 * 
 * For gains below 20%, returns the default percentage to avoid immediate triggers.
 * This ensures positions have room for normal price volatility before trailing stop loss activates.
 * 
 * @param priceChangePercent - Price change percentage above purchase price
 * @param defaultPercentage - Default stop loss percentage (e.g., -32 for loss-based)
 * @returns Stop loss percentage from purchase price
 */
export function calculateFixedStepperStopLoss(
  priceChangePercent: number,
  defaultPercentage: number = -32
): number {
  const stepSize = 10;
  const minimumGainThreshold = 20; // Only use trailing stop loss when gain >= 20%
  
  // For gains below threshold, use default percentage (avoids immediate triggers)
  if (priceChangePercent < minimumGainThreshold) {
    return defaultPercentage;
  }
  
  // For gains >= 20%, use the stepper formula
  return Math.max(0, priceChangePercent - stepSize);
}

/**
 * Calculate stop loss for Exponential Decay mode (Momentum-Based Formula)
 * 
 * Formula-based approach modeling token momentum dynamics:
 * - Early phase (0-20%): Uses default stop loss (avoids immediate triggers)
 * - Growth phase (20-75%): Exponential momentum build-up
 * - Pullback zone (75-85%): Natural pullback (Gaussian function creates smooth dip)
 * - Recovery phase (85%+): Momentum resumes with exponential acceleration
 * 
 * Uses mathematical functions (exponential, gaussian) to create organic momentum patterns.
 * 
 * @param priceChangePercent - Price change percentage above purchase price
 * @param defaultPercentage - Default stop loss percentage (e.g., -32 for loss-based)
 * @returns Stop loss percentage from purchase price
 */
export function calculateExponentialStopLoss(
  priceChangePercent: number,
  defaultPercentage: number = -32
): number {
  const noStopLossThreshold = 20; // 0-20%: Use default stop loss (avoids immediate triggers)
  
  if (priceChangePercent <= noStopLossThreshold) {
    // Early phase: Use default percentage to avoid immediate triggers
    return defaultPercentage;
  }
  
  // Normalize to start calculations from threshold
  const x = priceChangePercent - noStopLossThreshold;
  
  // Continuous formula approach: Base exponential trend with Gaussian pullback modulation
  
  // Base exponential growth - represents overall momentum trend
  // As price increases, stop loss naturally tightens
  const baseGrowthRate = 3.2;
  const baseKeep = 1 - Math.exp(-x / (100 / baseGrowthRate));
  
  // Pullback modulation using Gaussian function
  // Creates natural pullback zone around 75-85% (55-65 normalized)
  const pullbackCenter = 55; // Center of pullback zone (75% total)
  const pullbackWidth = 8; // Width of pullback (controls how spread out it is)
  const pullbackDepth = 0.12; // Depth of pullback (how much it loosens)
  
  // Gaussian function creates smooth bell curve for pullback
  // Formula: amplitude * e^(-((x - center)^2) / (2 * width^2))
  const gaussianPullback = pullbackDepth * Math.exp(
    -Math.pow((x - pullbackCenter) / pullbackWidth, 2) / 2
  );
  
  // Apply pullback modulation to base trend
  // Subtracting pullback creates the dip in the curve
  let keepPercentage = baseKeep - gaussianPullback;
  
  // Clamp values to reasonable bounds
  keepPercentage = Math.max(0, Math.min(0.90, keepPercentage));
  
  // For very high gains (beyond pullback), add acceleration factor
  // This creates the "climbing again" effect after pullback
  if (x > 65) {
    const excessX = x - 65;
    const accelerationFactor = 1 - Math.exp(-excessX / 80);
    const accelerationBoost = 0.30 * accelerationFactor; // Additional 30% max
    keepPercentage = Math.min(0.90, keepPercentage + accelerationBoost);
  }
  
  return priceChangePercent * keepPercentage;
}

/**
 * Calculate stop loss for Step-Based Zones mode
 * Uses 5 distinct zones with different keep percentages
 * 
 * For gains below 20%, uses default percentage to avoid immediate triggers.
 * 
 * @param priceChangePercent - Price change percentage above purchase price
 * @param defaultPercentage - Default stop loss percentage (e.g., -32 for loss-based)
 * @returns Stop loss percentage from purchase price
 */
export function calculateZonesStopLoss(
  priceChangePercent: number,
  defaultPercentage: number = -32
): number {
  const minimumGainThreshold = 20; // Only use trailing stop loss when gain >= 20%
  
  // For gains below threshold, use default percentage (avoids immediate triggers)
  if (priceChangePercent < minimumGainThreshold) {
    return defaultPercentage;
  }
  
  let keepPercentage: number;
  
  if (priceChangePercent <= 25) {
    keepPercentage = 0.50;  // Zone 1: 20-25%
  } else if (priceChangePercent <= 50) {
    keepPercentage = 0.60;  // Zone 2: 25-50%
  } else if (priceChangePercent <= 100) {
    keepPercentage = 0.70;  // Zone 3: 50-100%
  } else if (priceChangePercent <= 200) {
    keepPercentage = 0.80;  // Zone 4: 100-200%
  } else {
    keepPercentage = 0.85;  // Zone 5: 200%+
  }
  
  return priceChangePercent * keepPercentage;
}

/**
 * Calculate stop loss for Custom mode using discrete trailing levels
 * 
 * Returns the stop loss from the highest matching level, or null if no match.
 * Levels should be sorted descending by change.
 * 
 * @param priceChangePercent - Price change percentage above purchase price
 * @param trailingLevels - Array of trailing levels (should be sorted descending)
 * @returns Stop loss percentage from purchase price, or null if no level matches
 */
export function calculateCustomStopLoss(
  priceChangePercent: number,
  trailingLevels: TrailingLevel[]
): number | null {
  // Find all matching levels (where priceChangePercent >= level.change)
  const matchingLevels = trailingLevels.filter(level => priceChangePercent >= level.change);
  
  // If no levels match, return null
  if (matchingLevels.length === 0) {
    return null;
  }
  
  // Return the stop loss from the highest matching level (highest change value)
  // Sort descending by change and take the first (highest) one
  matchingLevels.sort((a, b) => b.change - a.change);
  return matchingLevels[0].stopLoss;
}

/**
 * Main entry point: Calculate stop loss percentage based on config
 * 
 * This is the primary function used by the backend stop loss manager.
 * Routes to the appropriate calculator based on the mode in the config.
 * 
 * @param priceChangePercent - Price change percentage above purchase price
 * @param config - Stop loss configuration containing mode and settings
 * @returns Stop loss percentage from purchase price
 */
export function calculateStopLossPercentage(
  priceChangePercent: number,
  config: StopLossConfig
): number {
  // Handle negative price changes (loss from purchase) - use default
  if (priceChangePercent < 0) {
    return config.defaultPercentage;
  }
  
  // Get mode, default to 'fixed' if not set (pre-launch, no backward compatibility needed)
  const mode: StopLossMode = config.mode || 'fixed';
  
  // Route to appropriate calculator based on mode
  let calculatedStopLoss: number;
  
  switch (mode) {
    case 'fixed':
      calculatedStopLoss = calculateFixedStepperStopLoss(priceChangePercent, config.defaultPercentage);
      break;
    
    case 'exponential':
      calculatedStopLoss = calculateExponentialStopLoss(priceChangePercent, config.defaultPercentage);
      break;
    
    case 'zones':
      calculatedStopLoss = calculateZonesStopLoss(priceChangePercent, config.defaultPercentage);
      break;
    
    case 'custom': {
      if (config.trailingLevels && config.trailingLevels.length > 0) {
        const customStopLoss = calculateCustomStopLoss(priceChangePercent, config.trailingLevels);
        if (customStopLoss !== null) {
          calculatedStopLoss = customStopLoss;
          break;
        }
      }
      // If no matching level, fall back to default percentage
      return config.defaultPercentage;
    }
    
    default:
      // Fallback to default for unknown modes
      return config.defaultPercentage;
  }
  
  // Safety check: If calculated stop loss is 0% or less, use default percentage
  // This prevents immediate triggers and ensures positions have proper loss protection
  if (calculatedStopLoss <= 0) {
    return config.defaultPercentage;
  }
  
  return calculatedStopLoss;
}

