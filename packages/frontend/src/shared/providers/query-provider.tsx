/**
 * QueryProvider - Provides React Query functionality to the application
 * 
 * Wraps the app with QueryClientProvider to enable React Query hooks
 * throughout the component tree. Configures default options for queries
 * and mutations.
 * 
 * @example
 * ```tsx
 * <QueryProvider>
 *   <App />
 * </QueryProvider>
 * ```
 */

'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * QueryProvider component
 * 
 * Creates a QueryClient instance (singleton pattern) and provides it
 * to all child components via React Query's context.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  // Singleton pattern - create QueryClient once, reuse across renders
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache data for 5 minutes before considering it stale
            staleTime: 5 * 60 * 1000,
            // Keep cached data for 10 minutes (garbage collection time)
            gcTime: 10 * 60 * 1000, // Previously cacheTime
            // Retry failed requests 3 times
            retry: 3,
            // Don't refetch when window regains focus by default (individual queries can override)
            // This prevents unnecessary refetches when user switches tabs
            refetchOnWindowFocus: false,
            // Don't refetch on mount if data is fresh
            refetchOnMount: false,
            // Don't refetch on reconnect by default
            refetchOnReconnect: false,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

