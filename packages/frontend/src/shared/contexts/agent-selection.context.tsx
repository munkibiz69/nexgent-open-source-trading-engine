/**
 * Agent Selection Context
 * 
 * Provides agent selection state throughout the application.
 * Manages the currently selected agent and handles initialization logic.
 * This is the single source of truth for agent selection.
 */

'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from './user.context';
import { useAgents, useAgent } from '@/features/agents';
import type { Agent } from '@/shared/types/api.types';

/**
 * Agent selection context value
 */
export interface AgentSelectionContextType {
  /** Currently selected agent ID, or null if none selected */
  selectedAgentId: string | null;
  /** Full agent object for the selected agent, or null if none selected */
  selectedAgent: Agent | null;
  /** List of all available agents for the current user */
  agents: Agent[];
  /** Whether agent data is currently loading */
  isLoading: boolean;
  /** Whether user has any agents */
  hasAgents: boolean;
  /** Whether an agent is currently selected */
  hasSelectedAgent: boolean;
  /** Function to select an agent by ID */
  selectAgent: (agentId: string) => void;
}

const AgentSelectionContext = createContext<AgentSelectionContextType | undefined>(undefined);

/**
 * AgentSelectionProvider - Provides agent selection state to the application
 * 
 * Manages the currently selected agent and handles initialization logic:
 * - Fetches agents for the current user
 * - Initializes selection from localStorage (for refresh persistence)
 * - Auto-selects first agent if none selected and agents exist
 * - Validates stored agent ID against available agents
 * - Persists selection changes to localStorage
 * 
 * @param children - Child components to wrap
 * 
 * @example
 * ```tsx
 * <AgentSelectionProvider>
 *   <App />
 * </AgentSelectionProvider>
 * ```
 */
export function AgentSelectionProvider({ children }: { children: ReactNode }) {
  const { user, loading: userLoading } = useUser();
  const queryClient = useQueryClient();
  
  // Initialize selectedAgentId from localStorage synchronously (for refresh persistence)
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('selectedAgentId');
    }
    return null;
  });

  // Fetch all agents for the current user
  const { data: agents = [], isLoading: isLoadingAgents, isFetched: isAgentsFetched } = useAgents(user?.id);

  // Fetch full details of the selected agent
  const { data: selectedAgent, isLoading: isLoadingSelectedAgent } = useAgent(
    selectedAgentId || undefined
  );

  // Persist selection to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && selectedAgentId) {
      localStorage.setItem('selectedAgentId', selectedAgentId);
      // Also store agent name for convenience (used by some components)
      const agent = agents.find(a => a.id === selectedAgentId);
      if (agent) {
        localStorage.setItem('selectedAgentName', agent.name);
      }
    } else if (typeof window !== 'undefined' && !selectedAgentId) {
      localStorage.removeItem('selectedAgentId');
      localStorage.removeItem('selectedAgentName');
    }
  }, [selectedAgentId, agents]);

  // Handle initialization and validation in a single effect
  useEffect(() => {
    // Must wait for user to be loaded (not loading and user exists)
    if (userLoading || !user?.id) {
      return;
    }

    // Must wait for agents query to actually complete
    // When query is disabled (user?.id undefined), isLoading=false but query hasn't run
    // We need isFetched=true to know the query has actually completed
    if (isLoadingAgents || !isAgentsFetched) {
      return;
    }

    // If we have agents and no selection, select the most recent one
    // This handles first login when localStorage is empty
    if (agents.length > 0 && !selectedAgentId) {
      const mostRecentAgent = agents[0];
      setSelectedAgentId(mostRecentAgent.id);
      return;
    }

    // If we have a selection, validate it still exists
    if (selectedAgentId && agents.length > 0) {
      const agentExists = agents.some(agent => agent.id === selectedAgentId);
      if (!agentExists) {
        // Selected agent no longer exists, reset to most recent
        const mostRecentAgent = agents[0];
        setSelectedAgentId(mostRecentAgent.id);
      }
    }

    // If no agents, clear selection
    if (agents.length === 0 && selectedAgentId) {
      setSelectedAgentId(null);
    }
  }, [userLoading, user?.id, isLoadingAgents, isAgentsFetched, agents, selectedAgentId]);

  // Function to programmatically select an agent
  // Checks both the agents array and React Query cache to handle newly created agents
  const selectAgent = useCallback((agentId: string) => {
    // First, check if agent exists in the current agents array
    const agentExistsInArray = agents.some(agent => agent.id === agentId);
    
    if (agentExistsInArray) {
      setSelectedAgentId(agentId);
      return;
    }

    // If not found in array, check React Query cache
    // This handles the case where a newly created agent hasn't propagated to the array yet
    // The cache is updated synchronously during agent creation, so we can rely on it
    if (user?.id) {
      const cachedAgents = queryClient.getQueryData<Agent[]>(['agents', user.id]);
      const agentExistsInCache = cachedAgents?.some(agent => agent.id === agentId);
      
      if (agentExistsInCache) {
        // Agent exists in cache (likely newly created), allow selection
        setSelectedAgentId(agentId);
        return;
      }
    }

    // Agent not found in either array or cache - log warning but don't throw
    // This prevents errors during edge cases while still providing visibility
    console.warn(`Agent ${agentId} not found in available agents or cache`);
  }, [agents, user?.id, queryClient]);

  // Computed values
  const hasAgents = agents.length > 0;
  // If selectedAgentId exists, we have a selection. The effect validates it exists.
  const hasSelectedAgent = !!selectedAgentId;
  const isLoading = isLoadingAgents || (isLoadingSelectedAgent && !!selectedAgentId);

  const value: AgentSelectionContextType = useMemo(
    () => ({
      selectedAgentId,
      selectedAgent: selectedAgent || null,
      agents,
      isLoading,
      hasAgents,
      hasSelectedAgent,
      selectAgent,
    }),
    [selectedAgentId, selectedAgent, agents, isLoading, hasAgents, hasSelectedAgent, selectAgent]
  );

  return (
    <AgentSelectionContext.Provider value={value}>
      {children}
    </AgentSelectionContext.Provider>
  );
}

/**
 * useAgentSelection - Hook to access agent selection context
 * 
 * @returns Agent selection context value with selected agent, agents list, and selection methods
 * @throws Error if used outside AgentSelectionProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { selectedAgent, agents, selectAgent, isLoading } = useAgentSelection();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   if (!selectedAgent) return <div>No agent selected</div>;
 *   
 *   return (
 *     <div>
 *       <p>Selected: {selectedAgent.name}</p>
 *       <button onClick={() => selectAgent(agents[0].id)}>Select First</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useAgentSelection(): AgentSelectionContextType {
  const context = useContext(AgentSelectionContext);
  if (context === undefined) {
    throw new Error('useAgentSelection must be used within AgentSelectionProvider');
  }
  return context;
}

