/**
 * Stop Loss Calculator Utilities
 * 
 * Frontend-specific utilities for stop loss calculations and chart visualization.
 * Re-exports calculation functions from shared package and adds UI-specific helpers.
 */

import type { StopLossMode, TrailingLevel } from '@nexgent/shared';
// Import calculation functions from shared package
import {
  calculateFixedStepperStopLoss,
  calculateExponentialStopLoss,
  calculateZonesStopLoss,
  calculateCustomStopLoss,
  calculateStopLossPercentage,
} from '@nexgent/shared';

// Re-export calculation functions from shared package
export {
  calculateFixedStepperStopLoss,
  calculateExponentialStopLoss,
  calculateZonesStopLoss,
  calculateCustomStopLoss,
  calculateStopLossPercentage,
};

/**
 * Calculate stop loss based on mode (frontend wrapper)
 * @deprecated Use calculateStopLossPercentage from shared package instead
 */
export function calculateStopLossByMode(
  mode: StopLossMode,
  change: number,
  customLevels?: TrailingLevel[]
): number {
  switch (mode) {
    case 'fixed':
      return calculateFixedStepperStopLoss(change, -32); // Use default -32% for gains < 20%
    case 'exponential':
      return calculateExponentialStopLoss(change, -32); // Use default -32% for gains < 20%
    case 'zones':
      return calculateZonesStopLoss(change, -32); // Use default -32% for gains < 20%
    case 'custom':
      if (customLevels && customLevels.length > 0) {
        const customStopLoss = calculateCustomStopLoss(change, customLevels);
        if (customStopLoss !== null) {
          return customStopLoss;
        }
      }
      // If no matching level, return 0 (will use default percentage)
      return 0;
    default:
      return 0;
  }
}

/**
 * Generate preview data points for chart visualization
 */
export function generateStopLossPreviewPoints(
  mode: StopLossMode,
  maxChange: number = 200,
  customLevels?: TrailingLevel[],
  defaultPercentage: number = -32
): Array<{ change: number; stopLoss: number }> {
  const points: Array<{ change: number; stopLoss: number }> = [];

  switch (mode) {
    case 'fixed': {
      // Generate points every 10% for step visualization
      for (let change = 10; change <= maxChange; change += 10) {
        points.push({
          change,
          stopLoss: calculateFixedStepperStopLoss(change, defaultPercentage),
        });
      }
      // Also add point at 0 for better visualization (shows default percentage)
      if (points.length > 0 && points[0].change > 0) {
        points.unshift({ change: 0, stopLoss: defaultPercentage });
      }
      break;
    }

    case 'exponential': {
      // Generate smooth curve with more points
      const step = Math.max(5, Math.floor(maxChange / 60));
      for (let change = 0; change <= maxChange; change += step) {
        points.push({
          change,
          stopLoss: calculateExponentialStopLoss(change, defaultPercentage),
        });
      }
      // Ensure we have the endpoint
      if (points[points.length - 1].change < maxChange) {
        points.push({
          change: maxChange,
          stopLoss: calculateExponentialStopLoss(maxChange, defaultPercentage),
        });
      }
      break;
    }

    case 'zones': {
      // Generate points at zone boundaries and some intermediate points
      const zoneBoundaries = [0, 25, 50, 100, 200];
      const additionalPoints = [10, 15, 37.5, 75, 150, 250];
      
      const allPoints = [...zoneBoundaries, ...additionalPoints]
        .filter(p => p <= maxChange)
        .sort((a, b) => a - b);
      
      // Remove duplicates and add endpoint if needed
      const uniquePoints = Array.from(new Set(allPoints));
      if (uniquePoints[uniquePoints.length - 1] < maxChange) {
        uniquePoints.push(maxChange);
      }
      
      for (const change of uniquePoints) {
        points.push({
          change,
          stopLoss: calculateZonesStopLoss(change, defaultPercentage),
        });
      }
      break;
    }

    case 'custom': {
      if (customLevels && customLevels.length > 0) {
        // Sort levels ascending for chart
        const sorted = [...customLevels].sort((a, b) => a.change - b.change);
        for (const level of sorted) {
          points.push({
            change: level.change,
            stopLoss: level.stopLoss,
          });
        }
      }
      break;
    }
  }

  return points;
}

/**
 * Get zone information for a given price change (Zones mode)
 */
export function getZoneForChange(change: number): {
  zone: number;
  keepPercentage: number;
  description: string;
} {
  if (change <= 25) {
    return {
      zone: 1,
      keepPercentage: 0.50,
      description: 'Zone 1 (0-25%): Keep 50%',
    };
  } else if (change <= 50) {
    return {
      zone: 2,
      keepPercentage: 0.60,
      description: 'Zone 2 (25-50%): Keep 60%',
    };
  } else if (change <= 100) {
    return {
      zone: 3,
      keepPercentage: 0.70,
      description: 'Zone 3 (50-100%): Keep 70%',
    };
  } else if (change <= 200) {
    return {
      zone: 4,
      keepPercentage: 0.80,
      description: 'Zone 4 (100-200%): Keep 80%',
    };
  } else {
    return {
      zone: 5,
      keepPercentage: 0.85,
      description: 'Zone 5 (200%+): Keep 85%',
    };
  }
}

