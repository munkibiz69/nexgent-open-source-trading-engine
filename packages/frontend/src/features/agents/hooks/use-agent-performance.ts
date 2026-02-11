'use client';

/**
 * useAgentPerformance Hook
 * 
 * Manages agent performance metrics by combining:
 * 1. Historical data (from API) - Realized PnL, Win Rate, etc.
 * 2. Real-time data (from WebSocket via positions prop) - Unrealized PnL, Portfolio Value
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { agentsService } from '@/infrastructure/api/services/agents.service';
import type { LivePosition, PerformanceSummary, UseAgentPerformanceReturn } from '../types/agent.types';

const INITIAL_METRICS: PerformanceSummary = {
  portfolioBalanceSol: 0,
  totalProfitLossSol: 0,
  realizedProfitLossSol: 0,
  unrealizedProfitLossSol: 0,
  averageReturn: 0,
  winRate: 0,
  totalClosedTrades: 0,
  totalOpenPositions: 0,
};

export function useAgentPerformance(
  agentId: string | null,
  activePositions: LivePosition[],
  timeframe: '24h' | 'all' = 'all',
  walletAddress?: string
): UseAgentPerformanceReturn {
  // Fetch baseline (historical) metrics from API using React Query
  // Filter by walletAddress to show only data for the current trading mode
  const {
    data: baselineMetrics = INITIAL_METRICS,
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery<PerformanceSummary, Error>({
    queryKey: ['agent-performance', agentId, timeframe, walletAddress],
    queryFn: () => agentsService.getAgentPerformance(agentId!, timeframe, walletAddress),
    enabled: !!agentId && !!walletAddress, // Only fetch when we have a wallet for the current trading mode
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // 10 second polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
    retry: 1,
  });

  // Convert query error to string for compatibility
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

  // Wrapper for refetch to match the expected signature
  const refetch = async () => {
    await refetchQuery();
  };

  // Calculate combined metrics (Memoized)
  const metrics = useMemo(() => {
    // If no wallet address is provided (no wallet for current trading mode), return empty metrics
    if (!agentId || !walletAddress) return INITIAL_METRICS;

    // Calculate real-time stats from active positions
    let currentPositionsValueSol = 0;
    let currentUnrealizedPnLSol = 0;

    activePositions.forEach(pos => {
      // Use current price if available, otherwise fall back to purchase price (0 PnL)
      const price = pos.currentPrice ?? pos.purchasePrice;
      
      // Use remainingAmount for positions with partial take-profits, fallback to purchaseAmount
      // This ensures position value reflects only tokens currently held, not tokens already sold
      // (sold tokens' value is already reflected in SOL balance from sale proceeds)
      const currentHolding = pos.remainingAmount ?? pos.purchaseAmount;
      
      const value = price * currentHolding;
      const costBasis = pos.purchasePrice * currentHolding;

      currentPositionsValueSol += value;
      currentUnrealizedPnLSol += (value - costBasis);
    });

    // Combine baseline API metrics with live position data
    // The API returns portfolioBalanceSol as a snapshot (SOL balance + position values at call time).
    // We approximate live updates by adjusting for the unrealized PnL delta since the API call.
    const unrealizedDelta = currentUnrealizedPnLSol - baselineMetrics.unrealizedProfitLossSol;

    return {
      ...baselineMetrics,
      // Update unrealized PnL with live data
      unrealizedProfitLossSol: currentUnrealizedPnLSol,

      // Update total PnL
      totalProfitLossSol: baselineMetrics.realizedProfitLossSol + currentUnrealizedPnLSol,

      // Update portfolio balance by the difference in PnL
      portfolioBalanceSol: baselineMetrics.portfolioBalanceSol + unrealizedDelta,

      // Update open positions count
      totalOpenPositions: activePositions.length,
    };
  }, [baselineMetrics, activePositions, agentId, walletAddress]);

  return {
    metrics,
    isLoading,
    error,
    refetch,
  };
}

