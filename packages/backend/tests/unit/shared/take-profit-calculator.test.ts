/**
 * Take-Profit Calculator Unit Tests
 * 
 * Tests the pure calculation functions for take-profit logic.
 * These functions are in the shared package but tested here due to Jest setup.
 */

import {
  calculateGainPercent,
  findTriggeredLevels,
  calculateTotalSellPercent,
  shouldActivateMoonBag,
  calculateSellAmount,
  calculateMoonBagAmount,
  evaluateTakeProfit,
  normalizeTakeProfitLevels,
  validateTakeProfitAllocation,
} from '@nexgent/shared';
import type { TakeProfitConfig, TakeProfitLevel, MoonBagConfig } from '@nexgent/shared';

describe('Take-Profit Calculator', () => {
  // ===========================================
  // calculateGainPercent
  // ===========================================
  describe('calculateGainPercent', () => {
    it('should return 0% for no price change', () => {
      expect(calculateGainPercent(100, 100)).toBe(0);
    });

    it('should calculate positive gain correctly', () => {
      // 100 -> 150 = 50% gain
      expect(calculateGainPercent(100, 150)).toBe(50);
    });

    it('should calculate large positive gain correctly', () => {
      // 100 -> 500 = 400% gain
      expect(calculateGainPercent(100, 500)).toBe(400);
    });

    it('should calculate negative gain (loss) correctly', () => {
      // 100 -> 80 = -20% loss
      expect(calculateGainPercent(100, 80)).toBe(-20);
    });

    it('should handle small decimal prices', () => {
      // 0.001 -> 0.0015 = 50% gain
      expect(calculateGainPercent(0.001, 0.0015)).toBeCloseTo(50, 5);
    });

    it('should return 0 when purchase price is 0', () => {
      expect(calculateGainPercent(0, 100)).toBe(0);
    });

    it('should return 0 when purchase price is negative', () => {
      expect(calculateGainPercent(-100, 100)).toBe(0);
    });
  });

  // ===========================================
  // findTriggeredLevels
  // ===========================================
  describe('findTriggeredLevels', () => {
    const defaultLevels: TakeProfitLevel[] = [
      { targetPercent: 50, sellPercent: 25 },
      { targetPercent: 150, sellPercent: 25 },
      { targetPercent: 300, sellPercent: 25 },
      { targetPercent: 400, sellPercent: 15 },
    ];

    it('should return empty array when gain is below first level', () => {
      const result = findTriggeredLevels(30, defaultLevels, 0);
      expect(result).toEqual([]);
    });

    it('should return first level when gain matches exactly', () => {
      const result = findTriggeredLevels(50, defaultLevels, 0);
      expect(result).toEqual([{ targetPercent: 50, sellPercent: 25 }]);
    });

    it('should return first level when gain exceeds it', () => {
      const result = findTriggeredLevels(75, defaultLevels, 0);
      expect(result).toEqual([{ targetPercent: 50, sellPercent: 25 }]);
    });

    it('should return multiple levels when gain jumps over them', () => {
      // Price jumped from below 50% to 160% - should trigger levels 1 and 2
      const result = findTriggeredLevels(160, defaultLevels, 0);
      expect(result).toEqual([
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
      ]);
    });

    it('should return all levels when gain exceeds all', () => {
      const result = findTriggeredLevels(500, defaultLevels, 0);
      expect(result).toEqual(defaultLevels);
    });

    it('should skip already-hit levels', () => {
      // 2 levels already hit, gain at 320%
      const result = findTriggeredLevels(320, defaultLevels, 2);
      expect(result).toEqual([{ targetPercent: 300, sellPercent: 25 }]);
    });

    it('should return empty when all levels already hit', () => {
      const result = findTriggeredLevels(500, defaultLevels, 4);
      expect(result).toEqual([]);
    });

    it('should handle empty levels array', () => {
      const result = findTriggeredLevels(100, [], 0);
      expect(result).toEqual([]);
    });
  });

  // ===========================================
  // calculateTotalSellPercent
  // ===========================================
  describe('calculateTotalSellPercent', () => {
    it('should sum all sell percentages', () => {
      const levels: TakeProfitLevel[] = [
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
        { targetPercent: 300, sellPercent: 25 },
        { targetPercent: 400, sellPercent: 15 },
      ];
      expect(calculateTotalSellPercent(levels)).toBe(90);
    });

    it('should return 0 for empty array', () => {
      expect(calculateTotalSellPercent([])).toBe(0);
    });

    it('should handle single level', () => {
      const levels: TakeProfitLevel[] = [
        { targetPercent: 100, sellPercent: 50 },
      ];
      expect(calculateTotalSellPercent(levels)).toBe(50);
    });
  });

  // ===========================================
  // shouldActivateMoonBag
  // ===========================================
  describe('shouldActivateMoonBag', () => {
    const defaultMoonBagConfig: MoonBagConfig = {
      enabled: true,
      triggerPercent: 300,
      retainPercent: 10,
    };

    it('should return false when moon bag is disabled', () => {
      const config = { ...defaultMoonBagConfig, enabled: false };
      expect(shouldActivateMoonBag(config, 350, false, false)).toBe(false);
    });

    it('should return false when already activated', () => {
      expect(shouldActivateMoonBag(defaultMoonBagConfig, 350, false, true)).toBe(false);
    });

    it('should return true when gain reaches trigger threshold', () => {
      expect(shouldActivateMoonBag(defaultMoonBagConfig, 300, false, false)).toBe(true);
    });

    it('should return true when gain exceeds trigger threshold', () => {
      expect(shouldActivateMoonBag(defaultMoonBagConfig, 350, false, false)).toBe(true);
    });

    it('should return true when approaching final level (even below trigger)', () => {
      expect(shouldActivateMoonBag(defaultMoonBagConfig, 200, true, false)).toBe(true);
    });

    it('should return false when below trigger and not approaching final level', () => {
      expect(shouldActivateMoonBag(defaultMoonBagConfig, 200, false, false)).toBe(false);
    });
  });

  // ===========================================
  // calculateSellAmount
  // ===========================================
  describe('calculateSellAmount', () => {
    it('should calculate sell amount from original position', () => {
      const levels: TakeProfitLevel[] = [
        { targetPercent: 50, sellPercent: 25 },
      ];
      // 25% of 1000 = 250
      expect(calculateSellAmount(1000, levels)).toBe(250);
    });

    it('should calculate cumulative sell amount for multiple levels', () => {
      const levels: TakeProfitLevel[] = [
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
      ];
      // 50% of 1000 = 500
      expect(calculateSellAmount(1000, levels)).toBe(500);
    });

    it('should return 0 for empty levels', () => {
      expect(calculateSellAmount(1000, [])).toBe(0);
    });

    it('should handle decimal token amounts', () => {
      const levels: TakeProfitLevel[] = [
        { targetPercent: 50, sellPercent: 25 },
      ];
      // 25% of 1234.5678 = 308.64195
      expect(calculateSellAmount(1234.5678, levels)).toBeCloseTo(308.64195, 5);
    });
  });

  // ===========================================
  // calculateMoonBagAmount
  // ===========================================
  describe('calculateMoonBagAmount', () => {
    it('should calculate moon bag amount correctly', () => {
      // 10% of 1000 = 100
      expect(calculateMoonBagAmount(1000, 10)).toBe(100);
    });

    it('should handle decimal amounts', () => {
      // 15% of 1234.5 = 185.175
      expect(calculateMoonBagAmount(1234.5, 15)).toBeCloseTo(185.175, 5);
    });

    it('should return 0 for 0% retain', () => {
      expect(calculateMoonBagAmount(1000, 0)).toBe(0);
    });
  });

  // ===========================================
  // normalizeTakeProfitLevels
  // ===========================================
  describe('normalizeTakeProfitLevels', () => {
    it('should sort levels by targetPercent ascending', () => {
      const unsorted: TakeProfitLevel[] = [
        { targetPercent: 300, sellPercent: 25 },
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
      ];
      const sorted = normalizeTakeProfitLevels(unsorted);
      expect(sorted).toEqual([
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
        { targetPercent: 300, sellPercent: 25 },
      ]);
    });

    it('should not mutate the original array', () => {
      const original: TakeProfitLevel[] = [
        { targetPercent: 300, sellPercent: 25 },
        { targetPercent: 50, sellPercent: 25 },
      ];
      const originalCopy = [...original];
      normalizeTakeProfitLevels(original);
      expect(original).toEqual(originalCopy);
    });

    it('should handle empty array', () => {
      expect(normalizeTakeProfitLevels([])).toEqual([]);
    });

    it('should handle already sorted array', () => {
      const sorted: TakeProfitLevel[] = [
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
      ];
      expect(normalizeTakeProfitLevels(sorted)).toEqual(sorted);
    });
  });

  // ===========================================
  // validateTakeProfitAllocation
  // ===========================================
  describe('validateTakeProfitAllocation', () => {
    it('should validate config with total exactly 100%', () => {
      const config: TakeProfitConfig = {
        enabled: true,
        mode: 'custom',
        levels: [
          { targetPercent: 50, sellPercent: 25 },
          { targetPercent: 150, sellPercent: 25 },
          { targetPercent: 300, sellPercent: 25 },
          { targetPercent: 400, sellPercent: 15 },
        ],
        moonBag: { enabled: true, triggerPercent: 300, retainPercent: 10 },
      };
      const result = validateTakeProfitAllocation(config);
      expect(result.valid).toBe(true);
      expect(result.totalSellPercent).toBe(90);
      expect(result.moonBagPercent).toBe(10);
      expect(result.totalAllocation).toBe(100);
    });

    it('should validate config with total below 100%', () => {
      const config: TakeProfitConfig = {
        enabled: true,
        mode: 'custom',
        levels: [
          { targetPercent: 50, sellPercent: 25 },
          { targetPercent: 150, sellPercent: 25 },
        ],
        moonBag: { enabled: true, triggerPercent: 150, retainPercent: 10 },
      };
      const result = validateTakeProfitAllocation(config);
      expect(result.valid).toBe(true);
      expect(result.totalAllocation).toBe(60);
    });

    it('should reject config with total exceeding 100%', () => {
      const config: TakeProfitConfig = {
        enabled: true,
        mode: 'custom',
        levels: [
          { targetPercent: 50, sellPercent: 25 },
          { targetPercent: 150, sellPercent: 25 },
          { targetPercent: 300, sellPercent: 25 },
          { targetPercent: 400, sellPercent: 25 },
        ],
        moonBag: { enabled: true, triggerPercent: 300, retainPercent: 10 },
      };
      const result = validateTakeProfitAllocation(config);
      expect(result.valid).toBe(false);
      expect(result.totalAllocation).toBe(110);
      expect(result.error).toContain('exceeds 100%');
    });

    it('should not count moon bag when disabled', () => {
      const config: TakeProfitConfig = {
        enabled: true,
        mode: 'custom',
        levels: [
          { targetPercent: 50, sellPercent: 50 },
          { targetPercent: 150, sellPercent: 50 },
        ],
        moonBag: { enabled: false, triggerPercent: 300, retainPercent: 10 },
      };
      const result = validateTakeProfitAllocation(config);
      expect(result.valid).toBe(true);
      expect(result.moonBagPercent).toBe(0);
      expect(result.totalAllocation).toBe(100);
    });
  });

  // ===========================================
  // evaluateTakeProfit (main function)
  // ===========================================
  describe('evaluateTakeProfit', () => {
    const defaultConfig: TakeProfitConfig = {
      enabled: true,
      mode: 'custom',
      levels: [
        { targetPercent: 50, sellPercent: 25 },
        { targetPercent: 150, sellPercent: 25 },
        { targetPercent: 300, sellPercent: 25 },
        { targetPercent: 400, sellPercent: 15 },
      ],
      moonBag: { enabled: true, triggerPercent: 300, retainPercent: 10 },
    };

    describe('when take-profit is disabled', () => {
      it('should not execute', () => {
        const result = evaluateTakeProfit({
          currentPrice: 200,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null,
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: { ...defaultConfig, enabled: false },
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('disabled');
      });
    });

    describe('when all levels are exhausted', () => {
      it('should not execute', () => {
        const result = evaluateTakeProfit({
          currentPrice: 600,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 100, // Only moon bag left
          levelsHit: 4, // All 4 levels hit
          moonBagActivated: true,
          currentMoonBagAmount: 100,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('exhausted');
      });
    });

    describe('when price is below first level', () => {
      it('should not execute', () => {
        const result = evaluateTakeProfit({
          currentPrice: 130, // 30% gain, below 50% level
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null,
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('30.00%');
        expect(result.reason).toContain('below');
      });
    });

    describe('when first level is triggered', () => {
      it('should execute level 1', () => {
        const result = evaluateTakeProfit({
          currentPrice: 150, // 50% gain
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null,
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(1);
        expect(result.levelsToExecute[0].targetPercent).toBe(50);
        expect(result.sellAmount).toBe(250); // 25% of 1000
        expect(result.activateMoonBag).toBe(false);
        expect(result.newRemainingAmount).toBe(750);
      });
    });

    describe('when price jumps multiple levels', () => {
      it('should execute all triggered levels cumulatively', () => {
        const result = evaluateTakeProfit({
          currentPrice: 260, // 160% gain - triggers level 1 and 2
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null,
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(2);
        expect(result.sellAmount).toBe(500); // 25% + 25% = 50% of 1000
        expect(result.newRemainingAmount).toBe(500);
      });
    });

    describe('moon bag activation', () => {
      it('should activate moon bag when trigger threshold is reached', () => {
        const result = evaluateTakeProfit({
          currentPrice: 400, // 300% gain
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 500, // After levels 1 & 2
          levelsHit: 2,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.activateMoonBag).toBe(true);
        expect(result.moonBagAmount).toBe(100); // 10% of 1000 (original)
        // sellAmount should be 25% of 1000 = 250, but capped by available
        // remaining (500) - moonBag reserve (100) = 400 available
        expect(result.sellAmount).toBe(250);
        expect(result.newRemainingAmount).toBe(250); // 500 - 250
      });

      it('should activate moon bag when approaching final level', () => {
        const result = evaluateTakeProfit({
          currentPrice: 500, // 400% gain - final level
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 250, // After levels 1, 2, 3
          levelsHit: 3,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.activateMoonBag).toBe(true);
        // remaining (250) - moonBag reserve (100) = 150 available
        // level 4 wants 15% of 1000 = 150
        expect(result.sellAmount).toBe(150);
        expect(result.newRemainingAmount).toBe(100); // Moon bag amount
      });

      it('should respect already-activated moon bag', () => {
        const result = evaluateTakeProfit({
          currentPrice: 500, // 400% gain
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 250,
          levelsHit: 3,
          moonBagActivated: true, // Already activated
          currentMoonBagAmount: 100,
          config: defaultConfig,
        });
        expect(result.activateMoonBag).toBe(false); // Don't re-activate
        expect(result.moonBagAmount).toBe(0);
        // Still respects the existing moon bag reserve
        expect(result.sellAmount).toBe(150);
      });
    });

    describe('when only moon bag remains', () => {
      it('should not execute (nothing available to sell)', () => {
        const result = evaluateTakeProfit({
          currentPrice: 600, // 500% gain
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 100, // Only moon bag
          levelsHit: 4, // All levels hit
          moonBagActivated: true,
          currentMoonBagAmount: 100,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('exhausted');
      });
    });

    describe('edge cases', () => {
      it('should handle remainingAmount being null (uses originalAmount)', () => {
        const result = evaluateTakeProfit({
          currentPrice: 150,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null, // Fresh position
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.sellAmount).toBe(250);
        expect(result.newRemainingAmount).toBe(750);
      });

      it('should cap sell amount at available tokens', () => {
        // Scenario: levels want to sell more than what's available
        const config: TakeProfitConfig = {
          enabled: true,
          mode: 'custom',
          levels: [
            { targetPercent: 50, sellPercent: 80 }, // 80% sell at once
          ],
          moonBag: { enabled: true, triggerPercent: 50, retainPercent: 30 },
        };
        const result = evaluateTakeProfit({
          currentPrice: 150,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: null,
          levelsHit: 0,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config,
        });
        // Wants to sell 80% = 800
        // But moon bag activates (30% = 300 reserve)
        // Available = 1000 - 300 = 700
        // Capped at 700
        expect(result.sellAmount).toBe(700);
        expect(result.activateMoonBag).toBe(true);
        expect(result.moonBagAmount).toBe(300);
        expect(result.newRemainingAmount).toBe(300); // Moon bag
      });
    });

    describe('append-levels model (DCA + TP)', () => {
      it('should use tpBatchStartLevel for level indexing after DCA', () => {
        // Scenario: Hit 2 TP levels, then DCA. Now levelsHit=2, tpBatchStartLevel=2.
        // Next level should be config.levels[0] (first level of new batch)
        const result = evaluateTakeProfit({
          currentPrice: 150, // 50% gain from new avg — triggers first config level
          purchasePrice: 100,
          originalAmount: 1375, // grew with DCA
          remainingAmount: 875,
          levelsHit: 2,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
          tpBatchStartLevel: 2,
          totalTakeProfitLevels: 6, // 2 + 4 = 6
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute).toHaveLength(1);
        expect(result.levelsToExecute[0].targetPercent).toBe(50); // First config level
      });

      it('should use totalTakeProfitLevels for exhaustion check', () => {
        // levelsHit=6, totalTakeProfitLevels=6 → all exhausted
        const result = evaluateTakeProfit({
          currentPrice: 600,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 100,
          levelsHit: 6,
          moonBagActivated: true,
          currentMoonBagAmount: 100,
          config: defaultConfig,
          tpBatchStartLevel: 4,
          totalTakeProfitLevels: 6,
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('exhausted');
      });

      it('should not exhaust when levelsHit < totalTakeProfitLevels', () => {
        // levelsHit=4, totalTakeProfitLevels=8, tpBatchStartLevel=4
        // batchLevelIndex = 4-4 = 0, gain needs to reach first config level
        const result = evaluateTakeProfit({
          currentPrice: 150, // 50% gain
          purchasePrice: 100,
          originalAmount: 2000,
          remainingAmount: 1000,
          levelsHit: 4,
          moonBagActivated: false,
          currentMoonBagAmount: null,
          config: defaultConfig,
          tpBatchStartLevel: 4,
          totalTakeProfitLevels: 8,
        });
        expect(result.shouldExecute).toBe(true);
        expect(result.levelsToExecute[0].targetPercent).toBe(50);
      });

      it('should default to config.levels.length when totalTakeProfitLevels is null', () => {
        // Backward compat: no DCA happened, totalTakeProfitLevels is null
        const result = evaluateTakeProfit({
          currentPrice: 600,
          purchasePrice: 100,
          originalAmount: 1000,
          remainingAmount: 100,
          levelsHit: 4,
          moonBagActivated: true,
          currentMoonBagAmount: 100,
          config: defaultConfig,
          tpBatchStartLevel: 0,
          totalTakeProfitLevels: null,
        });
        expect(result.shouldExecute).toBe(false);
        expect(result.reason).toContain('exhausted');
      });
    });
  });
});
