/**
 * Agent Transactions API Service
 *
 * Handles all agent transaction-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';
import type { AgentTransaction } from '@/shared/types/api.types';
import type { ListAgentTransactionsParams, CreateAgentTransactionRequest } from '@/shared/types/api.types';

export class AgentTransactionsService {
  async getAgentTransaction(transactionId: string): Promise<AgentTransaction> {
    const response = await apiClient.get(
      `/api/v1/agent-transactions/${transactionId}`,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch agent transaction');
    }

    return response.json();
  }

  async listAgentTransactions(
    params: ListAgentTransactionsParams,
  ): Promise<AgentTransaction[]> {
    const queryParams = new URLSearchParams();
    queryParams.set('agentId', params.agentId);

    if (params.walletAddress) {
      queryParams.set('walletAddress', params.walletAddress);
    }
    if (params.transactionType) {
      queryParams.set('transactionType', params.transactionType);
    }
    if (params.startTime) {
      queryParams.set('startTime', params.startTime);
    }
    if (params.endTime) {
      queryParams.set('endTime', params.endTime);
    }
    if (params.signalId !== undefined && params.signalId !== null) {
      queryParams.set(
        'signalId',
        typeof params.signalId === 'number'
          ? params.signalId.toString()
          : params.signalId,
      );
    }
    if (params.isDca !== undefined) {
      queryParams.set('isDca', params.isDca.toString());
    }
    if (params.isTakeProfit !== undefined) {
      queryParams.set('isTakeProfit', params.isTakeProfit.toString());
    }
    if (params.limit !== undefined) {
      queryParams.set('limit', params.limit.toString());
    }
    if (params.offset !== undefined) {
      queryParams.set('offset', params.offset.toString());
    }

    const response = await apiClient.get(
      `/api/v1/agent-transactions?${queryParams.toString()}`,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch transactions');
    }

    return response.json();
  }

  async createAgentTransaction(
    transactionData: CreateAgentTransactionRequest,
  ): Promise<AgentTransaction> {
    const response = await apiClient.post(
      '/api/v1/agent-transactions',
      transactionData,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(
        errorMessage || 'Failed to create agent transaction',
      );
    }

    return response.json();
  }
}

export const agentTransactionsService = new AgentTransactionsService();

// Export convenience functions for backward compatibility
export const getAgentTransaction = (transactionId: string) =>
  agentTransactionsService.getAgentTransaction(transactionId);
export const listAgentTransactions = (params: ListAgentTransactionsParams) =>
  agentTransactionsService.listAgentTransactions(params);
export const createAgentTransaction = (transactionData: CreateAgentTransactionRequest) =>
  agentTransactionsService.createAgentTransaction(transactionData);


