/**
 * Agent Trading Configuration hooks
 * 
 * React Query hooks for agent trading configuration operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentsService } from '@/infrastructure/api/services/agents.service';

const agentsService = new AgentsService();
const getAgentTradingConfig = (agentId: string) => 
  agentsService.getTradingConfig(agentId);
const updateAgentTradingConfig = (agentId: string, data: Partial<AgentTradingConfig>) => 
  agentsService.updateTradingConfig(agentId, data);
import type { AgentTradingConfig } from '@nexgent/shared';

/**
 * Hook to fetch agent trading configuration
 * 
 * @param agentId - Agent ID
 * @returns React Query result with trading configuration data
 * 
 * @example
 * ```tsx
 * const { data: config, isLoading, error } = useAgentTradingConfig(agentId);
 * ```
 */
export function useAgentTradingConfig(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agentTradingConfig', agentId],
    queryFn: () => getAgentTradingConfig(agentId!),
    enabled: !!agentId, // Only fetch if agentId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Config doesn't change frequently
  });
}

/**
 * Hook to update agent trading configuration
 * 
 * @returns Mutation object for updating trading configuration
 * 
 * @example
 * ```tsx
 * const updateConfigMutation = useUpdateAgentTradingConfig();
 * 
 * const handleUpdate = () => {
 *   updateConfigMutation.mutate({
 *     agentId: 'agent-123',
 *     data: {
 *       purchaseLimits: {
 *         maxPurchasePerToken: 3.0
 *       }
 *     }
 *   });
 * };
 * ```
 */
export function useUpdateAgentTradingConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: Partial<AgentTradingConfig> }) =>
      updateAgentTradingConfig(agentId, data),
    onSuccess: (updatedConfig, variables) => {
      // Update cache with the server response - no need to refetch
      queryClient.setQueryData(['agentTradingConfig', variables.agentId], updatedConfig);
    },
  });
}

