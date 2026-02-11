/**
 * API Keys Service
 *
 * Handles all API key-related API calls.
 *
 * @module infrastructure/api/services
 */

import { apiClient } from '../client/api-client';
import { extractErrorFromResponse } from '../client/error-handler';

/**
 * API key scope types
 * 
 * - signals: Read & write trading signals
 * - agents: Read agent data & configuration
 * - positions: Read open positions
 * - balances: Read agent balances
 * - transactions: Read transaction history
 * - history: Read historical swaps
 * - full_access: Full API access
 */
export type ApiKeyScope =
  | 'signals'
  | 'agents'
  | 'positions'
  | 'balances'
  | 'transactions'
  | 'history'
  | 'full_access';

/**
 * Request to create a new API key
 */
export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
}

/**
 * Response for a single API key (without the raw key)
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
}

/**
 * Response when creating a new API key (includes the raw key)
 * Note: The raw key is only shown once at creation time
 */
export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string;
}

/**
 * Response for listing API keys
 */
export interface ApiKeyListResponse {
  items: ApiKeyResponse[];
}

export class ApiKeysService {
  /**
   * Create a new API key
   */
  async createApiKey(params: CreateApiKeyRequest): Promise<ApiKeyCreatedResponse> {
    const response = await apiClient.post('/api/v1/api-keys', params);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to create API key');
    }

    return response.json();
  }

  /**
   * List all API keys for the current user
   */
  async listApiKeys(): Promise<ApiKeyListResponse> {
    const response = await apiClient.get('/api/v1/api-keys');

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to fetch API keys');
    }

    return response.json();
  }

  /**
   * Delete (revoke) an API key
   */
  async deleteApiKey(id: string): Promise<void> {
    const response = await apiClient.delete(`/api/v1/api-keys/${id}`);

    if (!response.ok) {
      const errorMessage = await extractErrorFromResponse(response);
      throw new Error(errorMessage || 'Failed to delete API key');
    }
  }
}

export const apiKeysService = new ApiKeysService();
