'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAgentSelection } from './agent-selection.context';

type TradingMode = 'simulation' | 'live';

interface TradingModeContextType {
  tradingMode: TradingMode | null;
  isLiveTrading: boolean;
  isLoading: boolean;
  hasAgent: boolean;
  agentId: string | null;
}

const TradingModeContext = createContext<TradingModeContextType | undefined>(undefined);

/**
 * Trading mode context provider
 * 
 * Manages global trading mode state based on the currently selected agent.
 * Reads the selected agent from AgentSelectionContext and derives trading mode.
 * 
 * @example
 * ```tsx
 * <TradingModeProvider>
 *   <App />
 * </TradingModeProvider>
 * ```
 */
export function TradingModeProvider({ children }: { children: ReactNode }) {
  // Get selected agent from AgentSelectionContext
  const { selectedAgent, selectedAgentId, isLoading: isLoadingAgent, hasSelectedAgent, agents } = useAgentSelection();

  // Get trading mode from selectedAgent if loaded, otherwise from agents list
  const agentFromList = selectedAgentId ? agents.find(a => a.id === selectedAgentId) : null;
  const tradingMode = selectedAgent?.tradingMode || agentFromList?.tradingMode || null;

  return (
    <TradingModeContext.Provider
      value={{
        tradingMode,
        isLiveTrading: tradingMode === 'live',
        isLoading: isLoadingAgent,
        hasAgent: hasSelectedAgent,
        agentId: selectedAgentId,
      }}
    >
      {children}
    </TradingModeContext.Provider>
  );
}

/**
 * Hook to access trading mode context
 * 
 * @returns Trading mode context with mode, loading state, and agent info
 * @throws Error if used outside TradingModeProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tradingMode, isLiveTrading } = useTradingMode();
 *   return <div>Mode: {tradingMode}</div>;
 * }
 * ```
 */
export function useTradingMode() {
  const context = useContext(TradingModeContext);
  if (context === undefined) {
    throw new Error('useTradingMode must be used within a TradingModeProvider');
  }
  return context;
}

