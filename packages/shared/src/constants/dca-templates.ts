/**
 * DCA (Dollar Cost Averaging) Templates
 * 
 * Pre-built DCA level configurations for different trading styles.
 * Users can choose a template or create custom levels.
 */

import type { DCALevel, DCAMode } from '../types/trading-config.js';

/**
 * Aggressive DCA template
 * Tighter levels, more frequent DCAs
 * Good for high-conviction plays where you want to average down quickly
 * All levels at -10% from current average price, each buying 100% more
 */
export const AGGRESSIVE_DCA_LEVELS: DCALevel[] = [
  { dropPercent: -10, buyPercent: 100 },  // At -10%, buy 100% more
  { dropPercent: -10, buyPercent: 100 },  // At -10% from new average, buy 100% more
  { dropPercent: -10, buyPercent: 100 },  // At -10% from new average, buy 100% more
];

/**
 * Moderate DCA template (DEFAULT)
 * Balanced approach for typical trading
 * Good for standard positions
 */
export const MODERATE_DCA_LEVELS: DCALevel[] = [
  { dropPercent: -20, buyPercent: 75 },  // At -20%, buy 75% more
  { dropPercent: -20, buyPercent: 75 },  // At -20% from new average, buy 75% more
];

/**
 * Conservative DCA template
 * Single DCA level for cautious trading
 * Good for uncertain markets or lower conviction plays
 */
export const CONSERVATIVE_DCA_LEVELS: DCALevel[] = [
  { dropPercent: -20, buyPercent: 100 },  // At -20%, buy 100% more
];

/**
 * Get DCA levels for a given mode
 * 
 * @param mode - DCA calculation mode
 * @returns Array of DCA levels for the mode
 */
export function getDCALevelsForMode(mode: DCAMode): DCALevel[] {
  switch (mode) {
    case 'aggressive':
      return [...AGGRESSIVE_DCA_LEVELS];
    case 'moderate':
      return [...MODERATE_DCA_LEVELS];
    case 'conservative':
      return [...CONSERVATIVE_DCA_LEVELS];
    case 'custom':
      return []; // Custom mode uses user-provided levels
    default:
      return [...MODERATE_DCA_LEVELS];
  }
}

/**
 * Get human-readable description for a DCA mode
 * 
 * @param mode - DCA calculation mode
 * @returns Description of the mode
 */
export function getDCAModeDescription(mode: DCAMode): string {
  switch (mode) {
    case 'aggressive':
      return '3 levels at -10% drop, each buying 100% more. After each buy, the average price updates, so the next -10% is measured from the new average. Best for high-conviction plays.';
    case 'moderate':
      return '2 levels at -20% drop, each buying 75% more. After each buy, the average price updates, so the next -20% is measured from the new average. Good for standard positions.';
    case 'conservative':
      return 'Single level at -20% drop, buying 100% more. Best for uncertain markets or lower conviction.';
    case 'custom':
      return 'Define your own DCA levels and buy amounts.';
    default:
      return '';
  }
}
