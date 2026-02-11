/**
 * Agent Balances hooks
 * 
 * React Query hooks for agent balance operations.
 */

import { useQuery } from '@tanstack/react-query';
import { AgentBalancesService } from '@/infrastructure/api/services/agent-balances.service';

const agentBalancesService = new AgentBalancesService();
const getAgentBalances = (agentId: string, walletAddress?: string) => 
  agentBalancesService.getAgentBalances(agentId, walletAddress);
const getAgentBalance = (balanceId: string) => 
  agentBalancesService.getAgentBalance(balanceId);
import type { AgentBalance } from '@/shared/types/api.types';

/**
 * Hook to fetch agent balances
 * 
 * @param agentId - Agent ID
 * @param walletAddress - Optional wallet address to filter balances by
 * @param enabled - Optional flag to enable/disable the query (defaults to true if agentId exists)
 * @returns React Query result with balances array
 * 
 * @example
 * ```tsx
 * const { data: balances, isLoading } = useAgentBalances('agent-id');
 * const { data: walletBalances, isLoading } = useAgentBalances('agent-id', 'wallet-address');
 * ```
 */
export function useAgentBalances(agentId: string | undefined, walletAddress?: string | undefined, enabled?: boolean) {
  return useQuery<AgentBalance[], Error>({
    queryKey: ['agent-balances', agentId, walletAddress],
    queryFn: () => getAgentBalances(agentId!, walletAddress),
    enabled: enabled !== undefined ? enabled : !!agentId,
    staleTime: 8 * 1000, // 8 seconds (slightly less than polling interval)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // 10 second polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
    retry: 1,
  });
}

/**
 * Hook to fetch a single agent balance
 * 
 * @param balanceId - Balance ID
 * @returns React Query result with balance data
 * 
 * @example
 * ```tsx
 * const { data: balance, isLoading } = useAgentBalance('balance-id');
 * ```
 */
export function useAgentBalance(balanceId: string | undefined) {
  return useQuery<AgentBalance, Error>({
    queryKey: ['agent-balances', balanceId],
    queryFn: () => getAgentBalance(balanceId!),
    enabled: !!balanceId,
    staleTime: 8 * 1000, // 8 seconds (slightly less than polling interval)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 10 * 1000, // 10 second polling
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
    retry: 1,
  });
}

