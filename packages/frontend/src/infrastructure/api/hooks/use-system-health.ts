/**
 * System Health hooks
 * 
 * React Query hooks for health check operations.
 * 
 * @module infrastructure/api/hooks
 */

import { useQuery } from '@tanstack/react-query';
import { healthService } from '../services/health.service';
import type { HealthStatus } from '../services/health.service';

/**
 * Hook to fetch system health status
 * 
 * @returns React Query result with health status
 * 
 * @example
 * ```tsx
 * const { data: health, isLoading, error } = useSystemHealth();
 * ```
 */
export function useSystemHealth() {
  return useQuery<HealthStatus, Error>({
    queryKey: ['health', 'status'],
    queryFn: () => healthService.getHealthStatus(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Auto-refresh every 60 seconds
    refetchOnWindowFocus: true,
    retry: 2,
  });
}

