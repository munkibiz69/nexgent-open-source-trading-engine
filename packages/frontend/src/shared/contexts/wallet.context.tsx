'use client';

import { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useUser } from './user.context';
import { useTradingMode } from './trading-mode.context';
import {
  getAgentWallets,
  assignWallet,
  type WalletListItem,
  type AvailableWallet,
  type ListWalletsResponse,
  type AssignWalletRequest,
} from '@/infrastructure/api/services/wallets.service';
import { useToast } from '@/shared/hooks/use-toast';

/**
 * Agent wallet with status information
 */
export interface AgentWallet extends WalletListItem {
  // WalletListItem already has all needed fields
}

/**
 * Wallet context type
 */
interface WalletContextType {
  // Wallet state
  wallets: AgentWallet[];
  availableWallets: AvailableWallet[];
  isLoading: boolean;
  error: Error | null;

  // Actions
  assignWallet: (
    agentId: string,
    walletAddress: string,
    walletType: 'live'
  ) => Promise<void>;
  refreshWallets: (agentId: string) => Promise<void>;

  // Helpers
  getWalletForAgent: (
    agentId: string,
    walletType: 'simulation' | 'live'
  ) => AgentWallet | null;
  getAgentWallets: (agentId: string) => AgentWallet[];
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

/**
 * Wallet context provider
 * 
 * Manages wallet state across the application.
 * Provides functions for creating, unlocking, locking, and exporting wallets.
 * 
 * @example
 * ```tsx
 * <WalletProvider>
 *   <App />
 * </WalletProvider>
 * ```
 */
export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { agentId } = useTradingMode();

  // Use agent ID from TradingModeContext (which reads from localStorage)
  const selectedAgentId = agentId;
  const { data: walletData, isLoading, error } = useQuery({
    queryKey: ['wallets', selectedAgentId],
    queryFn: () => (selectedAgentId ? getAgentWallets(selectedAgentId) : { agentWallets: [], availableWallets: [] }),
    enabled: !!selectedAgentId && !!user,
    staleTime: 30 * 1000, // 30 seconds
  });

  const wallets = walletData?.agentWallets || [];
  const availableWallets = walletData?.availableWallets || [];

  // Assign wallet mutation
  const assignWalletMutation = useMutation({
    mutationFn: async (params: AssignWalletRequest) => {
      return await assignWallet(params);
    },
    onSuccess: (data) => {
      // Invalidate wallets list to refetch
      queryClient.invalidateQueries({ queryKey: ['wallets'] });
      toast({
        title: 'Wallet assigned',
        description: data.message || `Wallet ${data.walletAddress.slice(0, 8)}... assigned successfully`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to assign wallet',
        variant: 'destructive',
      });
    },
  });

  // Action functions
  const handleAssignWallet = useCallback(
    async (agentId: string, walletAddress: string, walletType: 'live'): Promise<void> => {
      await assignWalletMutation.mutateAsync({
        agentId,
        walletAddress,
        walletType,
      });
    },
    [assignWalletMutation]
  );

  const handleRefreshWallets = useCallback(
    async (agentId: string): Promise<void> => {
      await queryClient.invalidateQueries({ queryKey: ['wallets', agentId] });
      await queryClient.refetchQueries({ queryKey: ['wallets', agentId] });
    },
    [queryClient]
  );

  // Helper functions
  const getWalletForAgent = useCallback(
    (agentId: string, walletType: 'simulation' | 'live'): AgentWallet | null => {
      return wallets.find((w) => w.walletType === walletType) || null;
    },
    [wallets]
  );

  const getAgentWalletsList = useCallback(
    (agentId: string): AgentWallet[] => {
      // For now, wallets are already filtered by selected agent
      // In the future, this could support multiple agents
      return wallets;
    },
    [wallets]
  );

  return (
    <WalletContext.Provider
      value={{
        wallets,
        availableWallets,
        isLoading,
        error: error as Error | null,
        assignWallet: handleAssignWallet,
        refreshWallets: handleRefreshWallets,
        getWalletForAgent,
        getAgentWallets: getAgentWalletsList,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

/**
 * Hook to access wallet context
 * 
 * @returns Wallet context with wallets, loading state, and actions
 * @throws Error if used outside WalletProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { wallets, createWallet } = useWallet();
 *   // ...
 * }
 * ```
 */
export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

