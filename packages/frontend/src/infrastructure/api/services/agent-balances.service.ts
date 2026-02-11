/**
 * Agent Balances API Service
 *
 * Handles all agent balance-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';
import type { AgentBalance } from '@/shared/types/api.types';

/**
 * Agent Balances API Service
 *
 * @example
 * ```ts
 * const balances = await agentBalancesService.getAgentBalances('agent-123');
 * ```
 */
export class AgentBalancesService {
  /**
   * Fetch all balances for an agent
   *
   * @param agentId - Agent ID
   * @param walletAddress - Optional wallet address to filter by
   * @returns Promise resolving to array of agent balances
   * @throws Error if request fails
   */
  async getAgentBalances(
    agentId: string,
    walletAddress?: string,
  ): Promise<AgentBalance[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('agentId', agentId);

    if (walletAddress) {
      queryParams.set('walletAddress', walletAddress);
    }

    const response = await apiClient.get(
      `/api/v1/agent-balances?${queryParams.toString()}`,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch agent balances');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  /**
   * Fetch a single agent balance by ID
   *
   * @param balanceId - Balance ID
   * @returns Promise resolving to agent balance
   * @throws Error if request fails
   */
  async getAgentBalance(balanceId: string): Promise<AgentBalance> {
    const response = await apiClient.get(`/api/v1/agent-balances/${balanceId}`);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch agent balance');
    }

    return response.json();
  }
}

export const agentBalancesService = new AgentBalancesService();


