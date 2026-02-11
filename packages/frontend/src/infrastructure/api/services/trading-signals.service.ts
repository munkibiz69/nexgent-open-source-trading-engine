/**
 * Trading Signals API Service
 *
 * Handles all trading signal-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';
import type { TradingSignal } from '@/shared/types/api.types';
import type {
  CreateTradingSignalRequest,
  ExportTradingSignalsQuery,
  TradingSignalResponse,
} from '@nexgent/shared';
import type {
  TradingSignalsQueryParams,
} from '@/shared/types/api.types';
import { format } from 'date-fns';

export class TradingSignalsService {
  async getTradingSignals(
    params?: TradingSignalsQueryParams,
  ): Promise<TradingSignal[]> {
    const queryParams = new URLSearchParams();

    if (params?.limit !== undefined) {
      queryParams.append('limit', params.limit.toString());
    }
    if (params?.offset !== undefined) {
      queryParams.append('offset', params.offset.toString());
    }
    if (params?.tokenAddress) {
      queryParams.append('tokenAddress', params.tokenAddress);
    }
    if (params?.signalType) {
      queryParams.append('signalType', params.signalType);
    }
    if (params?.startDate) {
      queryParams.append('startDate', params.startDate);
    }
    if (params?.endDate) {
      queryParams.append('endDate', params.endDate);
    }

    const queryString = queryParams.toString();
    const url = `/api/v1/trading-signals${
      queryString ? `?${queryString}` : ''
    }`;

    const response = await apiClient.get(url);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch trading signals');
    }

    const data = await response.json();
    return Array.isArray(data) ? data : [];
  }

  async getTradingSignal(
    signalId: number | string,
  ): Promise<TradingSignal> {
    const response = await apiClient.get(
      `/api/v1/trading-signals/${signalId}`,
    );

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch trading signal');
    }

    return response.json();
  }

  /**
   * Create a trading signal (e.g. test signal from dashboard).
   * Uses authenticated session (JWT). Backend emits signal for normal processing.
   */
  async createTradingSignal(
    request: CreateTradingSignalRequest,
  ): Promise<TradingSignalResponse> {
    const response = await apiClient.post('/api/v1/trading-signals', request);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to create trading signal');
    }

    return response.json();
  }

  /**
   * Export trading signals to CSV
   * Streams CSV file directly from backend
   * 
   * @param query - Export query parameters (same filters as list, no pagination)
   * @param signal - Optional AbortSignal for cancelling the request
   * @returns Promise that resolves when download starts
   * @throws Error with user-friendly message based on error type
   */
  async exportTradingSignals(
    query: ExportTradingSignalsQuery,
    signal?: AbortSignal
  ): Promise<void> {
    const queryParams = new URLSearchParams();

    if (query.tokenAddress) {
      queryParams.append('tokenAddress', query.tokenAddress);
    }
    if (query.signalType) {
      queryParams.append('signalType', query.signalType);
    }
    if (query.startDate) {
      queryParams.append('startDate', query.startDate);
    }
    if (query.endDate) {
      queryParams.append('endDate', query.endDate);
    }
    
    // Pass user's timezone for proper date formatting in CSV
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    queryParams.append('timezone', timezone);

    const queryString = queryParams.toString();
    const url = `/api/v1/trading-signals/export${
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
        let errorMessage = 'Failed to export trading signals';
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
      link.download = `trading-signals-${format(new Date(), 'yyyy-MM-dd')}.csv`;
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

export const tradingSignalsService = new TradingSignalsService();

