/**
 * Agent hooks
 * 
 * React Query hooks for agent operations.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgentsService } from '@/infrastructure/api/services/agents.service';

const agentsService = new AgentsService();
const getAgents = (userId?: string) => agentsService.getAgents(userId);
const getAgent = (agentId: string) => agentsService.getAgent(agentId);
const createAgent = (data: CreateAgentRequest) => agentsService.createAgent(data);
const updateAgent = (agentId: string, data: UpdateAgentRequest) => agentsService.updateAgent(agentId, data);
const deleteAgent = (agentId: string) => agentsService.deleteAgent(agentId);
import type { Agent, CreateAgentRequest, UpdateAgentRequest } from '@/shared/types/api.types';

/**
 * Hook to fetch agents
 * 
 * @param userId - Optional user ID to filter agents
 * @returns React Query result with agents data
 * 
 * @example
 * ```tsx
 * const { data: agents, isLoading, error } = useAgents(user?.id);
 * ```
 */
export function useAgents(userId?: string) {
  return useQuery({
    queryKey: ['agents', userId],
    queryFn: () => getAgents(userId),
    enabled: !!userId, // Only fetch if userId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
  });
}

/**
 * Hook to fetch a single agent
 * 
 * @param agentId - Agent ID
 * @returns React Query result with agent data
 */
export function useAgent(agentId: string | undefined) {
  return useQuery({
    queryKey: ['agents', agentId],
    queryFn: () => getAgent(agentId!),
    enabled: !!agentId, // Only fetch if agentId is provided
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false, // Don't refetch when tab regains focus
  });
}

/**
 * Hook to create a new agent
 * 
 * @returns Mutation object for creating agents
 * 
 * @example
 * ```tsx
 * const createAgentMutation = useCreateAgent();
 * 
 * const handleCreate = () => {
 *   createAgentMutation.mutate({
 *     name: 'My Agent',
 *     bio: 'Agent description',
 *   });
 * };
 * ```
 */
export function useCreateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgent,
    onSuccess: (newAgent) => {
      // Optimistically update cache instead of invalidating
      queryClient.setQueryData(['agents', newAgent.userId], (old: Agent[] | undefined) => {
        return old ? [...old, newAgent] : [newAgent];
      });
      // Only invalidate if optimistic update fails or for other agent lists
      queryClient.invalidateQueries({ 
        queryKey: ['agents'],
        exact: false, // Invalidate all agent-related queries
      });
    },
  });
}

/**
 * Hook to update an agent
 * 
 * @returns Mutation object for updating agents
 */
export function useUpdateAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agentId, data }: { agentId: string; data: UpdateAgentRequest }) =>
      updateAgent(agentId, data),
    onSuccess: (updatedAgent) => {
      // Optimistically update cache for single agent query
      queryClient.setQueryData(['agents', updatedAgent.id], updatedAgent);
      
      // Update in agents list cache (query key is ['agents', userId])
      // Use setQueriesData to update any agents list cache that contains this agent
      queryClient.setQueriesData<Agent[]>(
        { queryKey: ['agents'], exact: false },
        (old) => {
          if (!old || !Array.isArray(old)) return old;
          return old.map(agent => agent.id === updatedAgent.id ? updatedAgent : agent);
        }
      );
      
      // Also invalidate to ensure fresh data on next access
      queryClient.invalidateQueries({ 
        queryKey: ['agents'],
        exact: false,
      });
      
      // Invalidate performance and historical data when trading mode changes
      // This ensures data is refetched with the correct wallet filter
      if ('tradingMode' in (updatedAgent as any)) {
        queryClient.invalidateQueries({ queryKey: ['agent-performance'] });
        queryClient.invalidateQueries({ queryKey: ['agent-historical-swaps'] });
        queryClient.invalidateQueries({ queryKey: ['agent-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['agent-balance-history'] });
      }
    },
  });
}

/**
 * Hook to delete an agent
 * 
 * @returns Mutation object for deleting agents
 */
export function useDeleteAgent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteAgent,
    onSuccess: (_, agentId) => {
      // Optimistically remove from cache
      queryClient.setQueryData(['agents'], (old: Agent[] | undefined) => {
        if (!old) return old;
        return old.filter(agent => agent.id !== agentId);
      });
      // Remove specific agent query
      queryClient.removeQueries({ queryKey: ['agents', agentId] });
      // Invalidate related queries
      queryClient.invalidateQueries({ 
        queryKey: ['agents'],
        exact: false,
      });
    },
  });
}

