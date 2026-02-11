/**
 * Agent Historical Swaps API Service
 *
 * Handles all agent historical swap-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';
import type { AgentHistoricalSwap } from '@/shared/types/api.types';
import type { ExportAgentHistoricalSwapsQuery } from '@nexgent/shared';
import { format } from 'date-fns';

export interface ListAgentHistoricalSwapsQuery {
  agentId: string;
  walletAddress?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  startPurchaseTime?: string;
  endPurchaseTime?: string;
  startSaleTime?: string;
  endSaleTime?: string;
  signalId?: number | string;
  purchaseTransactionId?: string;
  saleTransactionId?: string;
  minProfitLossUsd?: number;
  maxProfitLossUsd?: number;
  limit?: number;
  offset?: number;
}

export class AgentHistoricalSwapsService {
  async listAgentHistoricalSwaps(
    query: ListAgentHistoricalSwapsQuery,
  ): Promise<AgentHistoricalSwap[]> {
    const queryParams = new URLSearchParams();

    queryParams.append('agentId', query.agentId);

    if (query.walletAddress) {
      queryParams.append('walletAddress', query.walletAddress);
    }
    if (query.tokenAddress) {
      queryParams.append('tokenAddress', query.tokenAddress);
    }
    if (query.tokenSymbol) {
      queryParams.append('tokenSymbol', query.tokenSymbol);
    }
    if (query.startPurchaseTime) {
      queryParams.append('startPurchaseTime', query.startPurchaseTime);
    }
    if (query.endPurchaseTime) {
      queryParams.append('endPurchaseTime', query.endPurchaseTime);
    }
    if (query.startSaleTime) {
      queryParams.append('startSaleTime', query.startSaleTime);
    }
    if (query.endSaleTime) {
      queryParams.append('endSaleTime', query.endSaleTime);
    }
    if (query.signalId !== undefined) {
      queryParams.append('signalId', query.signalId.toString());
    }
    if (query.purchaseTransactionId) {
      queryParams.append(
        'purchaseTransactionId',
        query.purchaseTransactionId,
      );
    }
    if (query.saleTransactionId) {
      queryParams.append('saleTransactionId', query.saleTransactionId);
    }
    if (query.minProfitLossUsd !== undefined) {
      queryParams.append(
        'minProfitLossUsd',
        query.minProfitLossUsd.toString(),
      );
    }
    if (query.maxProfitLossUsd !== undefined) {
      queryParams.append(
        'maxProfitLossUsd',
        query.maxProfitLossUsd.toString(),
      );
    }
    if (query.limit !== undefined) {
      queryParams.append('limit', query.limit.toString());
    }
    if (query.offset !== undefined) {
      queryParams.append('offset', query.offset.toString());
    }

    const queryString = queryParams.toString();
    const url = `/api/v1/agent-historical-swaps${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiClient.get(url);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(
        errorMessage || 'Failed to fetch agent historical swaps',
      );
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async getAgentHistoricalSwap(
    swapId: string,
  ): Promise<AgentHistoricalSwap> {
    const response = await apiClient.get(
      `/api/v1/agent-historical-swaps/${swapId}`,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(
        errorMessage || 'Failed to fetch agent historical swap',
      );
    }

    return response.json();
  }

  /**
   * Export agent historical swaps to CSV
   * Streams CSV file directly from backend
   * 
   * @param query - Export query parameters (same filters as list, no pagination)
   * @param signal - Optional AbortSignal for cancelling the request
   * @returns Promise that resolves when download starts
   * @throws Error with user-friendly message based on error type
   */
  async exportAgentHistoricalSwaps(
    query: ExportAgentHistoricalSwapsQuery,
    signal?: AbortSignal
  ): Promise<void> {
    const queryParams = new URLSearchParams();

    queryParams.append('agentId', query.agentId);

    if (query.walletAddress) {
      queryParams.append('walletAddress', query.walletAddress);
    }
    if (query.tokenAddress) {
      queryParams.append('tokenAddress', query.tokenAddress);
    }
    if (query.tokenSymbol) {
      queryParams.append('tokenSymbol', query.tokenSymbol);
    }
    if (query.startPurchaseTime) {
      queryParams.append('startPurchaseTime', query.startPurchaseTime);
    }
    if (query.endPurchaseTime) {
      queryParams.append('endPurchaseTime', query.endPurchaseTime);
    }
    if (query.startSaleTime) {
      queryParams.append('startSaleTime', query.startSaleTime);
    }
    if (query.endSaleTime) {
      queryParams.append('endSaleTime', query.endSaleTime);
    }
    if (query.signalId) {
      queryParams.append('signalId', query.signalId);
    }
    if (query.purchaseTransactionId) {
      queryParams.append('purchaseTransactionId', query.purchaseTransactionId);
    }
    if (query.saleTransactionId) {
      queryParams.append('saleTransactionId', query.saleTransactionId);
    }
    if (query.minProfitLossUsd) {
      queryParams.append('minProfitLossUsd', query.minProfitLossUsd);
    }
    if (query.maxProfitLossUsd) {
      queryParams.append('maxProfitLossUsd', query.maxProfitLossUsd);
    }
    
    // Pass user's timezone for proper date formatting in CSV
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    queryParams.append('timezone', timezone);
    
    // Pass currency preference and SOL price for proper price formatting
    if (query.currency) {
      queryParams.append('currency', query.currency);
    }
    if (query.solPrice) {
      queryParams.append('solPrice', query.solPrice);
    }

    const queryString = queryParams.toString();
    const url = `/api/v1/agent-historical-swaps/export${
      queryString ? `?${queryString}` : ''
    }`;

    // Create AbortController with timeout (6 minutes - slightly longer than backend timeout)
    const timeoutMs = 6 * 60 * 1000; // 6 minutes
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, timeoutMs);

    // Combine user signal with timeout signal
    if (signal) {
      signal.addEventListener('abort', () => {
        abortController.abort();
        clearTimeout(timeoutId);
      });
    }

    try {
      // Use fetch directly to support AbortSignal
      const session = await import('next-auth/react').then(m => m.getSession());
      const token = (session as { accessToken?: string } | null)?.accessToken;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        (headers as Record<string, string>).Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}${url}`, {
        method: 'GET',
        headers,
        signal: abortController.signal,
      });

      clearTimeout(timeoutId);

      // Handle abort
      if (abortController.signal.aborted) {
        throw new Error('Export cancelled');
      }

      if (!response.ok) {
        const errorData = await extractErrorFromResponse(response);
        
        // Provide user-friendly error messages based on status code
        let errorMessage = 'Failed to export historical swaps';
        if (response.status === 408 || response.status === 504) {
          errorMessage = 'Export timed out. The dataset may be too large. Please try again with more specific filters.';
        } else if (response.status === 503) {
          errorMessage = 'Database connection error. Please try again in a few moments.';
        } else if (response.status === 401 || response.status === 403) {
          errorMessage = 'You do not have permission to export this data.';
        } else if (errorData) {
          errorMessage = errorData;
        }
        
        throw new Error(errorMessage);
      }

      // Get blob and trigger browser download
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `agent-trades-${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Handle abort errors
      if (error instanceof Error && error.name === 'AbortError') {
        if (signal?.aborted) {
          throw new Error('Export cancelled by user');
        } else {
          throw new Error('Export timed out. Please try again with more specific filters.');
        }
      }
      
      // Re-throw other errors
      throw error;
    }
  }
}

export const agentHistoricalSwapsService = new AgentHistoricalSwapsService();


