/**
 * Wallets hooks
 * 
 * React Query hooks for wallet operations.
 * 
 * Note: Most wallet functionality is managed through WalletContext.
 * These hooks provide additional convenience functions if needed.
 */

import { useQuery } from '@tanstack/react-query';
import { WalletsService } from '@/infrastructure/api/services/wallets.service';

const walletsService = new WalletsService();
const getAgentWallets = (agentId: string) => walletsService.getAgentWallets(agentId);
import type { WalletListItem } from '@/shared/types/api.types';

/**
 * Hook to fetch agent wallets
 * 
 * @param agentId - Agent ID
 * @returns React Query result with wallets array
 * 
 * @example
 * ```tsx
 * const { data: wallets, isLoading } = useWallets('agent-id');
 * ```
 */
export function useWallets(agentId: string | undefined) {
  return useQuery<WalletListItem[], Error>({
    queryKey: ['wallets', agentId],
    queryFn: async () => {
      const response = await getAgentWallets(agentId!);
      return response.agentWallets;
    },
    enabled: !!agentId,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false, // Wallets don't change frequently
  });
}

