/**
 * Agent feature types
 * 
 * Type definitions specific to the agents feature module.
 */

import type { OpenPosition } from '@nexgent/shared';

/**
 * Live position with enriched price data
 * Matches the enriched position structure from WebSocket initial_data
 */
export interface LivePosition extends OpenPosition {
  currentPrice?: number;           // Current price in SOL (from price updates)
  currentPriceUsd?: number;        // Current price in USD
  purchasePriceUsd?: number;       // Purchase price in USD (for accurate P/L calculation)
  priceChangePercent?: number;     // Price change from entry
  positionValueUsd?: number;       // Current position value in USD
  positionValueSol?: number;        // Current position value in SOL
  profitLossUsd?: number;          // Profit/loss in USD
  profitLossSol?: number;          // Profit/loss in SOL
  profitLossPercent?: number;      // Profit/loss percentage
}

/**
 * Performance summary metrics
 */
export interface PerformanceSummary {
  portfolioBalanceSol: number;
  totalProfitLossSol: number;
  realizedProfitLossSol: number;
  unrealizedProfitLossSol: number;
  averageReturn: number;
  winRate: number;
  totalClosedTrades: number;
  totalOpenPositions: number;
}

/**
 * Agent performance hook return type
 */
export interface UseAgentPerformanceReturn {
  metrics: PerformanceSummary;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Balance snapshot data point
 */
export interface BalanceSnapshot {
  timestamp: string;
  portfolioBalanceSol: string;
  solBalance: string;
  positionsValueSol: string;
  unrealizedPnLSol: string;
}

/**
 * Balance history API response
 */
export interface BalanceHistoryResponse {
  agentId: string;
  timeframe: '24h' | 'all';
  snapshots: BalanceSnapshot[];
}

/**
 * Agent balance history hook return type
 */
export interface UseAgentBalanceHistoryReturn {
  data: BalanceHistoryResponse | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

