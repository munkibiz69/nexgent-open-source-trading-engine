/**
 * Trading Signals hooks
 * 
 * React Query hooks for trading signal operations.
 */

import { useQuery } from '@tanstack/react-query';
import { TradingSignalsService } from '@/infrastructure/api/services/trading-signals.service';
import type { TradingSignalsQueryParams } from '@/shared/types/api.types';

const tradingSignalsService = new TradingSignalsService();

// Re-export functions for backward compatibility
const getTradingSignals = (params?: TradingSignalsQueryParams) => 
  tradingSignalsService.getTradingSignals(params);
const getTradingSignal = (signalId: number | string) => 
  tradingSignalsService.getTradingSignal(signalId);

/**
 * Hook to fetch trading signals with optional filtering
 * 
 * @param params - Query parameters for filtering and pagination
 * @returns React Query result with trading signals data
 * 
 * @example
 * ```tsx
 * const { data: signals, isLoading } = useTradingSignals({
 *   limit: 100,
 *   signalType: 'BUY',
 * });
 * ```
 */
export function useTradingSignals(params?: TradingSignalsQueryParams) {
  return useQuery({
    queryKey: ['trading-signals', params],
    queryFn: () => getTradingSignals(params),
    refetchInterval: 10000, // 10 second polling
    staleTime: 8 * 1000, // 8 seconds (slightly less than polling to allow updates)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
    retry: 1,
  });
}

/**
 * Hook to fetch a single trading signal
 * 
 * @param signalId - Trading signal ID
 * @returns React Query result with trading signal data
 */
export function useTradingSignal(signalId: number | string | undefined) {
  return useQuery({
    queryKey: ['trading-signals', signalId],
    queryFn: () => getTradingSignal(signalId!),
    enabled: signalId !== undefined && signalId !== null,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

