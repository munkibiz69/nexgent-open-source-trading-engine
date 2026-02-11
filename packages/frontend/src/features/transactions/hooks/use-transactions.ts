/**
 * Transactions hooks
 * 
 * React Query hooks for agent transaction operations.
 */

import { useQuery } from '@tanstack/react-query';
import { AgentTransactionsService } from '@/infrastructure/api/services/agent-transactions.service';
import type { ListAgentTransactionsParams } from '@/shared/types/api.types';

const agentTransactionsService = new AgentTransactionsService();
const getAgentTransaction = (transactionId: string) => 
  agentTransactionsService.getAgentTransaction(transactionId);
const listAgentTransactions = (params: ListAgentTransactionsParams) => 
  agentTransactionsService.listAgentTransactions(params);
import type { AgentTransaction } from '@/shared/types/api.types';

/**
 * Hook to fetch a single agent transaction
 * 
 * @param transactionId - Agent transaction ID
 * @returns React Query result with agent transaction data
 * 
 * @example
 * ```tsx
 * const { data: transaction, isLoading } = useTransaction('transaction-id');
 * ```
 */
export function useTransaction(transactionId: string | undefined) {
  return useQuery<AgentTransaction, Error>({
    queryKey: ['agent-transactions', transactionId],
    queryFn: () => getAgentTransaction(transactionId!),
    enabled: !!transactionId,
    staleTime: 5 * 60 * 1000, // 5 minutes (transactions don't change)
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
  });
}

/**
 * Hook to fetch a list of agent transactions with optional filtering
 * 
 * @param params - Query parameters for filtering and pagination
 * @param options - Optional query options (e.g., enabled flag)
 * @returns React Query result with array of agent transactions
 * 
 * @example
 * ```tsx
 * const { data: transactions, isLoading } = useTransactions({
 *   agentId: 'agent-123',
 *   transactionType: 'SWAP',
 *   limit: 10,
 *   offset: 0,
 * });
 * ```
 */
export function useTransactions(params: ListAgentTransactionsParams, options?: { enabled?: boolean }) {
  return useQuery<AgentTransaction[], Error>({
    queryKey: ['agent-transactions', 'list', params],
    queryFn: () => listAgentTransactions(params),
    enabled: !!params.agentId && (options?.enabled ?? true), // Use provided enabled option
    staleTime: 50 * 1000, // 50 seconds (slightly less than polling interval)
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchInterval: 60 * 1000, // Refetch every minute
    refetchOnWindowFocus: false,
    refetchOnReconnect: false, // Don't refetch on reconnect (polling handles it)
  });
}

