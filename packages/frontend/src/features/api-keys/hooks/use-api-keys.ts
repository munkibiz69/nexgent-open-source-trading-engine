/**
 * API Keys hooks
 * 
 * React Query hooks for API key operations.
 * 
 * @module features/api-keys/hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  apiKeysService,
  type ApiKeyResponse,
  type ApiKeyCreatedResponse,
  type CreateApiKeyRequest,
} from '@/infrastructure/api/services/api-keys.service';

const API_KEYS_QUERY_KEY = ['api-keys'] as const;

/**
 * Hook to fetch all API keys for the current user
 */
export function useApiKeys() {
  return useQuery<ApiKeyResponse[], Error>({
    queryKey: API_KEYS_QUERY_KEY,
    queryFn: async () => {
      const response = await apiKeysService.listApiKeys();
      return response.items;
    },
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to create a new API key
 */
export function useCreateApiKey() {
  const queryClient = useQueryClient();

  return useMutation<ApiKeyCreatedResponse, Error, CreateApiKeyRequest>({
    mutationFn: (params) => apiKeysService.createApiKey(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}

/**
 * Hook to delete an API key
 */
export function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: (id) => apiKeysService.deleteApiKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: API_KEYS_QUERY_KEY });
    },
  });
}
