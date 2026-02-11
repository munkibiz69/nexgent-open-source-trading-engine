/**
 * Historical Swaps hooks
 * 
 * React Query hooks for agent historical swap operations.
 */

import { useQuery } from '@tanstack/react-query';
import { AgentHistoricalSwapsService } from '@/infrastructure/api/services/agent-historical-swaps.service';
import type { ListAgentHistoricalSwapsQuery } from '@/infrastructure/api/services/agent-historical-swaps.service';

const agentHistoricalSwapsService = new AgentHistoricalSwapsService();
const getAgentHistoricalSwaps = (query: ListAgentHistoricalSwapsQuery) => 
  agentHistoricalSwapsService.listAgentHistoricalSwaps(query);
const getAgentHistoricalSwap = (swapId: string) => 
  agentHistoricalSwapsService.getAgentHistoricalSwap(swapId);
import type { AgentHistoricalSwap } from '@/shared/types/api.types';

/**
 * Hook to fetch agent historical swaps with optional filtering
 * 
 * @param query - Query parameters for filtering and pagination
 * @param options - Optional query options (e.g., enabled flag)
 * @returns React Query result with agent historical swaps data
 * 
 * @example
 * ```tsx
 * const { data: swaps, isLoading } = useHistoricalSwaps({
 *   agentId: 'agent-id',
 *   limit: 100,
 * });
 * ```
 */
export function useHistoricalSwaps(query: ListAgentHistoricalSwapsQuery, options?: { enabled?: boolean }) {
  return useQuery<AgentHistoricalSwap[], Error>({
    queryKey: ['agent-historical-swaps', query],
    queryFn: () => getAgentHistoricalSwaps(query),
    enabled: !!query.agentId && (options?.enabled ?? true), // Use provided enabled option
    staleTime: 10 * 1000, // 10 seconds (matches polling interval)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // 10 second polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
    retry: 1,
  });
}

/**
 * Hook to fetch a single agent historical swap
 * 
 * @param swapId - Agent historical swap ID
 * @returns React Query result with agent historical swap data
 */
export function useHistoricalSwap(swapId: string | undefined) {
  return useQuery<AgentHistoricalSwap, Error>({
    queryKey: ['agent-historical-swaps', swapId],
    queryFn: () => getAgentHistoricalSwap(swapId!),
    enabled: !!swapId,
    staleTime: 5 * 60 * 1000, // 5 minutes (historical data doesn't change)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

