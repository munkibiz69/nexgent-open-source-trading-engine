/**
 * API Key types
 * Shared between frontend and backend
 */

import type { ApiKeyScope } from '../../validators/api-keys.schema.js';

/**
 * Request body for creating an API key
 */
export interface CreateApiKeyRequest {
  name: string;
  scopes: ApiKeyScope[];
}

/**
 * API key response (without the raw key)
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: Date;
}

/**
 * API key response when created (includes the raw key, shown only once)
 */
export interface ApiKeyCreatedResponse extends ApiKeyResponse {
  key: string;
}

/**
 * List API keys response
 */
export interface ApiKeyListResponse {
  items: ApiKeyResponse[];
}
