/**
 * Take-Profit Templates
 * 
 * Pre-built take-profit level configurations for different trading styles.
 * Users can choose a template or create custom levels.
 */

import type { TakeProfitLevel, TakeProfitMode, MoonBagConfig } from '../types/trading-config.js';

/**
 * Aggressive Take-Profit template
 * Lower targets, more frequent profit-taking
 * Good for volatile markets or quick flips
 * Total: 90% sold (25+25+25+15), 10% moon bag at 100%
 */
export const AGGRESSIVE_TAKE_PROFIT_LEVELS: TakeProfitLevel[] = [
  { targetPercent: 25, sellPercent: 25 },   // At 25% gain, sell 25%
  { targetPercent: 50, sellPercent: 25 },   // At 50% gain, sell 25%
  { targetPercent: 100, sellPercent: 25 },  // At 100% gain, sell 25%
  { targetPercent: 150, sellPercent: 15 },  // At 150% gain, sell 15%
];

export const AGGRESSIVE_MOON_BAG: MoonBagConfig = {
  enabled: true,
  triggerPercent: 100,
  retainPercent: 10,
};

/**
 * Moderate Take-Profit template (DEFAULT)
 * Standard targets for typical trading
 * Total: 90% sold (25+25+25+15), 10% moon bag at 300%
 */
export const MODERATE_TAKE_PROFIT_LEVELS: TakeProfitLevel[] = [
  { targetPercent: 50, sellPercent: 25 },   // At 50% gain (1.5x), sell 25%
  { targetPercent: 150, sellPercent: 25 },  // At 150% gain (2.5x), sell 25%
  { targetPercent: 300, sellPercent: 25 },  // At 300% gain (4x), sell 25%
  { targetPercent: 400, sellPercent: 15 },  // At 400% gain (5x), sell 15%
];

export const MODERATE_MOON_BAG: MoonBagConfig = {
  enabled: true,
  triggerPercent: 300,
  retainPercent: 10,
};

/**
 * Conservative Take-Profit template
 * Higher targets, fewer sales, larger moon bag
 * Good for high-conviction long-term plays
 * Total: 85% sold (20+20+25+20), 15% moon bag at 400%
 */
export const CONSERVATIVE_TAKE_PROFIT_LEVELS: TakeProfitLevel[] = [
  { targetPercent: 100, sellPercent: 20 },  // At 100% gain (2x), sell 20%
  { targetPercent: 200, sellPercent: 20 },  // At 200% gain (3x), sell 20%
  { targetPercent: 400, sellPercent: 25 },  // At 400% gain (5x), sell 25%
  { targetPercent: 600, sellPercent: 20 },  // At 600% gain (7x), sell 20%
];

export const CONSERVATIVE_MOON_BAG: MoonBagConfig = {
  enabled: true,
  triggerPercent: 400,
  retainPercent: 15,
};

/**
 * Get take-profit levels for a given mode
 * 
 * @param mode - Take-profit calculation mode
 * @returns Array of take-profit levels for the mode
 */
export function getTakeProfitLevelsForMode(mode: TakeProfitMode): TakeProfitLevel[] {
  switch (mode) {
    case 'aggressive':
      return [...AGGRESSIVE_TAKE_PROFIT_LEVELS];
    case 'moderate':
      return [...MODERATE_TAKE_PROFIT_LEVELS];
    case 'conservative':
      return [...CONSERVATIVE_TAKE_PROFIT_LEVELS];
    case 'custom':
      return []; // Custom mode uses user-provided levels
    default:
      return [...MODERATE_TAKE_PROFIT_LEVELS];
  }
}

/**
 * Get moon bag config for a given mode
 * 
 * @param mode - Take-profit calculation mode
 * @returns Moon bag config for the mode
 */
export function getMoonBagForMode(mode: TakeProfitMode): MoonBagConfig {
  switch (mode) {
    case 'aggressive':
      return { ...AGGRESSIVE_MOON_BAG };
    case 'moderate':
      return { ...MODERATE_MOON_BAG };
    case 'conservative':
      return { ...CONSERVATIVE_MOON_BAG };
    case 'custom':
      return { enabled: true, triggerPercent: 300, retainPercent: 10 };
    default:
      return { ...MODERATE_MOON_BAG };
  }
}

/**
 * Get human-readable description for a take-profit mode
 * 
 * @param mode - Take-profit calculation mode
 * @returns Description of the mode
 */
export function getTakeProfitModeDescription(mode: TakeProfitMode): string {
  switch (mode) {
    case 'aggressive':
      return '4 levels starting at 25% gain. Takes profits early and often. 90% total sold across levels, 10% moon bag at 100% gain. Best for volatile markets or quick flips.';
    case 'moderate':
      return '4 levels starting at 50% gain (1.5x). Balanced approach for typical trading. 90% total sold, 10% moon bag at 300% gain (4x). Good for standard positions.';
    case 'conservative':
      return '4 levels starting at 100% gain (2x). Higher targets for long-term plays. 85% total sold, 15% moon bag at 400% gain (5x). Best for high-conviction holds.';
    case 'custom':
      return 'Define your own take-profit levels and sell amounts.';
    default:
      return '';
  }
}
