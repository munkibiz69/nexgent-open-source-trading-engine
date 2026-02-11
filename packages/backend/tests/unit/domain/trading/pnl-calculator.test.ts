/**
 * PnL Calculator Unit Tests
 *
 * Tests pure profit/loss calculation for full sale and partial (take-profit) sale.
 * Ensures correct cash-flow PnL and proportional cost basis.
 */

import {
  computeFullSalePnL,
  computePartialSalePnL,
} from '@/domain/trading/pnl-calculator.js';

describe('computeFullSalePnL', () => {
  const solPriceUsd = 100;

  it('should compute profit when sale exceeds cost basis', () => {
    const totalInvestedSol = 1.0;
    const totalSolReceived = 1.1;
    const originalCostBasisSol = 1.0;

    const result = computeFullSalePnL(
      totalInvestedSol,
      totalSolReceived,
      originalCostBasisSol,
      solPriceUsd
    );

    expect(result.profitLossSol).toBeCloseTo(0.1, 10);
    expect(result.changePercent).toBeCloseTo(10, 10);
    expect(result.profitLossUsd).toBeCloseTo(10, 10);
  });

  it('should compute loss when sale is below cost basis', () => {
    const totalInvestedSol = 1.0;
    const totalSolReceived = 0.85;
    const originalCostBasisSol = 1.0;

    const result = computeFullSalePnL(
      totalInvestedSol,
      totalSolReceived,
      originalCostBasisSol,
      solPriceUsd
    );

    expect(result.profitLossSol).toBeCloseTo(-0.15, 10);
    expect(result.changePercent).toBeCloseTo(-15, 10);
    expect(result.profitLossUsd).toBeCloseTo(-15, 10);
  });

  it('should return zero change when cost basis is zero', () => {
    const result = computeFullSalePnL(0, 0.5, 0, solPriceUsd);
    expect(result.profitLossSol).toBeCloseTo(0.5, 10);
    expect(result.changePercent).toBe(0);
    expect(result.profitLossUsd).toBeCloseTo(50, 10);
  });

  it('should handle break-even (totalSolReceived equals totalInvestedSol)', () => {
    const totalInvestedSol = 2.0;
    const totalSolReceived = 2.0;
    const originalCostBasisSol = 2.0;

    const result = computeFullSalePnL(
      totalInvestedSol,
      totalSolReceived,
      originalCostBasisSol,
      solPriceUsd
    );

    expect(result.profitLossSol).toBe(0);
    expect(result.changePercent).toBe(0);
    expect(result.profitLossUsd).toBe(0);
  });

  it('should use originalCostBasisSol only for changePercent denominator', () => {
    // DCA case: totalInvestedSol includes extra DCA buy, originalCostBasisSol is first purchase only
    const totalInvestedSol = 1.5; // 1.0 + 0.5 DCA
    const totalSolReceived = 1.6;
    const originalCostBasisSol = 1.0; // first purchase only

    const result = computeFullSalePnL(
      totalInvestedSol,
      totalSolReceived,
      originalCostBasisSol,
      solPriceUsd
    );

    expect(result.profitLossSol).toBeCloseTo(0.1, 10); // 1.6 - 1.5
    expect(result.changePercent).toBeCloseTo(10, 10); // 0.1 / 1.0 * 100
    expect(result.profitLossUsd).toBeCloseTo(10, 10);
  });
});

describe('computePartialSalePnL', () => {
  const solPriceUsd = 100;

  it('should compute profit for partial sale above cost basis', () => {
    const totalInvestedSol = 1.0;
    const totalPurchaseAmount = 100;
    const sellAmountTokens = 50;
    const netSaleSol = 0.6; // sold 50 tokens for 0.6 SOL (price 0.012)
    const purchasePrice = 0.01; // 1 SOL / 100 tokens
    const salePrice = 0.012;

    const result = computePartialSalePnL(
      totalInvestedSol,
      totalPurchaseAmount,
      sellAmountTokens,
      netSaleSol,
      purchasePrice,
      salePrice,
      solPriceUsd
    );

    expect(result.costBasis).toBeCloseTo(0.5, 10); // 50/100 * 1.0
    expect(result.profitLossSol).toBeCloseTo(0.1, 10); // 0.6 - 0.5
    expect(result.changePercent).toBeCloseTo(20, 10); // (0.012 - 0.01) / 0.01 * 100
    expect(result.profitLossUsd).toBeCloseTo(10, 10);
  });

  it('should compute proportional cost basis for half position', () => {
    const totalInvestedSol = 2.0;
    const totalPurchaseAmount = 200;
    const sellAmountTokens = 100;
    const netSaleSol = 0.9; // sold at a loss
    const purchasePrice = 0.01;
    const salePrice = 0.009;

    const result = computePartialSalePnL(
      totalInvestedSol,
      totalPurchaseAmount,
      sellAmountTokens,
      netSaleSol,
      purchasePrice,
      salePrice,
      solPriceUsd
    );

    expect(result.costBasis).toBeCloseTo(1.0, 10); // 100/200 * 2.0
    expect(result.profitLossSol).toBeCloseTo(-0.1, 10); // 0.9 - 1.0
    expect(result.changePercent).toBeCloseTo(-10, 10); // (0.009 - 0.01) / 0.01 * 100
  });

  it('should return zero cost basis when totalPurchaseAmount is zero', () => {
    const result = computePartialSalePnL(
      1.0,
      0,
      10,
      0.5,
      0.01,
      0.05,
      solPriceUsd
    );

    expect(result.costBasis).toBe(0);
    expect(result.profitLossSol).toBe(0.5);
    expect(result.changePercent).toBe(400); // (0.05 - 0.01) / 0.01 * 100
  });

  it('should return zero change when purchase price is zero', () => {
    const result = computePartialSalePnL(
      1.0,
      100,
      50,
      0.5,
      0,
      0.01,
      solPriceUsd
    );

    expect(result.costBasis).toBeCloseTo(0.5, 10);
    expect(result.profitLossSol).toBeCloseTo(0, 10);
    expect(result.changePercent).toBe(0);
  });
});
