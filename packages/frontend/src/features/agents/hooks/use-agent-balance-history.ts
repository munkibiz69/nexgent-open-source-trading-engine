'use client';

/**
 * useAgentBalanceHistory Hook
 * 
 * Fetches agent balance history snapshots for charting.
 * Supports '24h' timeframe (hourly snapshots) and 'all' timeframe (daily snapshots).
 */

import { useQuery } from '@tanstack/react-query';
import { agentsService } from '@/infrastructure/api/services/agents.service';
import type { BalanceHistoryResponse, UseAgentBalanceHistoryReturn } from '../types/agent.types';

export function useAgentBalanceHistory(
  agentId: string | null,
  walletAddress: string | null | undefined,
  timeframe: '24h' | 'all' = 'all'
): UseAgentBalanceHistoryReturn {
  const {
    data = null,
    isLoading,
    error: queryError,
    refetch: refetchQuery,
  } = useQuery<BalanceHistoryResponse, Error>({
    queryKey: ['agent-balance-history', agentId, walletAddress, timeframe],
    queryFn: () => agentsService.getAgentBalanceHistory(agentId!, walletAddress!, timeframe),
    enabled: !!agentId && !!walletAddress,
    staleTime: 30 * 1000, // 30 seconds (balance history changes less frequently)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 30 * 1000, // 30 second polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: 1,
  });

  // Convert query error to string for compatibility
  const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

  // Wrapper for refetch to match the expected signature
  const refetch = async () => {
    await refetchQuery();
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}
