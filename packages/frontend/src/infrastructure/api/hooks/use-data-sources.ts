/**
 * Data Sources hooks
 * 
 * React Query hooks for data source operations.
 * 
 * @module infrastructure/api/hooks
 */

import { useQuery } from '@tanstack/react-query';
import { dataSourcesService } from '../services/data-sources.service';
import type { DataSourceStatus } from '../services/data-sources.service';

/**
 * Hook to fetch data source status
 * 
 * @returns React Query result with data source status
 * 
 * @example
 * ```tsx
 * const { data: dataSources, isLoading, error } = useDataSources();
 * ```
 */
export function useDataSources() {
  return useQuery<DataSourceStatus, Error>({
    queryKey: ['data-sources', 'status'],
    queryFn: () => dataSourcesService.getDataSourceStatus(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

