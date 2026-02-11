/**
 * Wallets API Service
 *
 * Handles all wallet-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';
import type {
  WalletListItem,
  AvailableWallet,
  ListWalletsResponse,
  AssignWalletRequest,
  AssignWalletResponse,
} from '@/shared/types/api.types';

/**
 * Check deposits response from the API
 */
export interface CheckDepositsResponse {
  success: boolean;
  depositDetected: boolean;
  previousBalance: number;
  onChainBalance: number;
  depositAmount: number | null;
  transactionId: string | null;
  message: string;
}

export class WalletsService {
  async getAgentWallets(agentId: string): Promise<ListWalletsResponse> {
    const response = await apiClient.get(`/api/v1/wallets/agent/${agentId}`);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch wallets');
    }

    return response.json();
  }

  async assignWallet(
    params: AssignWalletRequest,
  ): Promise<AssignWalletResponse> {
    const response = await apiClient.post('/api/v1/wallets/assign', params);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to assign wallet');
    }

    return response.json();
  }

  /**
   * Check for on-chain deposits to a live wallet
   * 
   * Queries Solana RPC for on-chain balance and compares with database.
   * If a deposit is detected, creates a DEPOSIT transaction and updates balance.
   * 
   * @param walletAddress - The live wallet address to check
   * @param agentId - The agent ID that owns the wallet
   * @returns Deposit check result with details
   */
  async checkForDeposits(
    walletAddress: string,
    agentId: string,
  ): Promise<CheckDepositsResponse> {
    const response = await apiClient.post(
      `/api/v1/wallets/${walletAddress}/check-deposits`,
      { agentId }
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to check for deposits');
    }

    return response.json();
  }

  /**
   * Unassign a live wallet from an agent
   *
   * Clears all transaction history and wallet assignment from the database.
   * Allows assigning a new wallet. Only for live wallets.
   */
  async unassignWallet(walletAddress: string): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post(
      `/api/v1/wallets/${walletAddress}/unassign`,
      { confirm: true }
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to unassign wallet');
    }

    return response.json();
  }
}

export const walletsService = new WalletsService();

// Export convenience functions
export const getAgentWallets = (agentId: string) =>
  walletsService.getAgentWallets(agentId);
export const assignWallet = (params: AssignWalletRequest) =>
  walletsService.assignWallet(params);
export const checkForDeposits = (walletAddress: string, agentId: string) =>
  walletsService.checkForDeposits(walletAddress, agentId);
export const unassignWallet = (walletAddress: string) =>
  walletsService.unassignWallet(walletAddress);

// Re-export types
export type {
  WalletListItem,
  AvailableWallet,
  ListWalletsResponse,
  AssignWalletRequest,
  AssignWalletResponse,
};

