/**
 * Profit/loss calculation utilities (pure functions)
 *
 * Used by trading executor for full sale and partial (take-profit) PnL.
 * Kept in a separate module for testability and to avoid precision/rounding bugs.
 */

/**
 * Result of a full position sale PnL calculation (cash-flow method).
 */
export interface FullSalePnLResult {
  profitLossSol: number;
  changePercent: number;
  profitLossUsd: number;
}

/**
 * Computes profit/loss for a full position close (sale).
 * Cash-flow method: total SOL received (after fees) minus total invested.
 *
 * @param totalInvestedSol - Total SOL spent (including DCA buys and fees)
 * @param totalSolReceived - Total SOL received from this sale + any prior take-profits (net of fees)
 * @param originalCostBasisSol - purchasePrice * purchaseAmount (for change % denominator)
 * @param solPriceUsd - SOL price in USD (for profitLossUsd)
 */
export function computeFullSalePnL(
  totalInvestedSol: number,
  totalSolReceived: number,
  originalCostBasisSol: number,
  solPriceUsd: number
): FullSalePnLResult {
  const profitLossSol = totalSolReceived - totalInvestedSol;
  const changePercent =
    originalCostBasisSol > 0 ? (profitLossSol / originalCostBasisSol) * 100 : 0;
  const profitLossUsd = profitLossSol * solPriceUsd;
  return { profitLossSol, changePercent, profitLossUsd };
}

/**
 * Result of a partial (take-profit) sale PnL calculation.
 */
export interface PartialSalePnLResult {
  profitLossSol: number;
  changePercent: number;
  profitLossUsd: number;
  costBasis: number;
}

/**
 * Computes profit/loss for a partial position sale (e.g. one take-profit level).
 * Proportional cost basis: (sellAmount / totalPurchaseAmount) * totalInvestedSol.
 *
 * @param totalInvestedSol - Total SOL invested in the position (including DCA)
 * @param totalPurchaseAmount - Total tokens in position (before this sale)
 * @param sellAmountTokens - Tokens sold in this partial sale
 * @param netSaleSol - SOL received from this sale (after fees)
 * @param purchasePrice - Average purchase price (SOL per token)
 * @param salePrice - Sale price for this partial sale (SOL per token)
 * @param solPriceUsd - SOL price in USD
 */
export function computePartialSalePnL(
  totalInvestedSol: number,
  totalPurchaseAmount: number,
  sellAmountTokens: number,
  netSaleSol: number,
  purchasePrice: number,
  salePrice: number,
  solPriceUsd: number
): PartialSalePnLResult {
  const costBasis =
    totalPurchaseAmount > 0
      ? (sellAmountTokens / totalPurchaseAmount) * totalInvestedSol
      : 0;
  const profitLossSol = netSaleSol - costBasis;
  const changePercent =
    purchasePrice > 0 ? ((salePrice - purchasePrice) / purchasePrice) * 100 : 0;
  const profitLossUsd = profitLossSol * solPriceUsd;
  return { profitLossSol, changePercent, profitLossUsd, costBasis };
}
