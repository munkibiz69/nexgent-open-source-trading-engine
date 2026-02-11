/**
 * Export Trades Hook
 * 
 * React Query mutation hook for exporting agent historical swaps to CSV.
 * Includes retry logic for transient errors.
 */

import { useMutation } from '@tanstack/react-query';
import { agentHistoricalSwapsService } from '@/infrastructure/api/services/agent-historical-swaps.service';
import type { ExportAgentHistoricalSwapsQuery } from '@nexgent/shared';
import { useToast } from '@/shared/hooks/use-toast';
import { useRef } from 'react';

/**
 * Determines if an error is retryable
 */
function isRetryableError(error: Error): boolean {
  const message = error.message.toLowerCase();
  // Retry on timeout, network errors, and database connection errors
  // Don't retry on user cancellation, auth errors, or validation errors
  return (
    message.includes('timeout') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('database') ||
    message.includes('503') ||
    message.includes('504') ||
    message.includes('408')
  ) && !message.includes('cancelled') && !message.includes('401') && !message.includes('403');
}

/**
 * Hook to export agent historical swaps to CSV
 * 
 * @returns React Query mutation for exporting trades with retry support
 * 
 * @example
 * ```tsx
 * const exportTrades = useExportTrades();
 * 
 * const handleExport = () => {
 *   exportTrades.mutate({
 *     agentId: 'agent-id',
 *     // ... other filters
 *   });
 * };
 * ```
 */
export function useExportTrades() {
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);

  const mutation = useMutation({
    mutationFn: async (query: ExportAgentHistoricalSwapsQuery) => {
      // Create abort controller for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;
      
      try {
        return await agentHistoricalSwapsService.exportAgentHistoricalSwaps(
          query,
          abortController.signal
        );
      } finally {
        // Clear reference when done
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    },
    retry: (failureCount, error) => {
      // Retry up to 2 times for retryable errors
      if (failureCount >= 2) return false;
      if (error instanceof Error && isRetryableError(error)) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s
      return Math.min(1000 * Math.pow(2, attemptIndex), 2000);
    },
    onSuccess: () => {
      toast({
        title: 'Export started',
        description: 'Your CSV file download has started.',
      });
    },
    onError: (error: Error) => {
      console.error('Export failed:', error);
      
      // Don't show error toast for user cancellation
      if (error.message.toLowerCase().includes('cancelled')) {
        return;
      }
      
      toast({
        title: 'Export failed',
        description: error.message || 'Failed to export trades. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Add cancel method to mutation
  return {
    ...mutation,
    cancel: () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    },
  };
}
