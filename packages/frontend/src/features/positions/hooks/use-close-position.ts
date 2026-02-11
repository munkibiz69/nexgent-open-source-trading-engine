'use client';

/**
 * Hook for closing positions
 * 
 * Provides functionality to close a position via API.
 */

import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useToast } from '@/shared/hooks/use-toast';
import { API_URL } from '@/infrastructure/api/client/api-client';
import type { LivePosition } from '@/features/agents';

interface UseClosePositionReturn {
  closePosition: (agentId: string, position: LivePosition) => Promise<void>;
  isClosing: boolean;
}

/**
 * Hook to close a position
 * 
 * @returns Object with closePosition function and loading state
 * 
 * @example
 * ```tsx
 * const { closePosition, isClosing } = useClosePosition();
 * 
 * await closePosition(agentId, position);
 * ```
 */
export function useClosePosition(): UseClosePositionReturn {
  const { data: session } = useSession();
  const { toast } = useToast();
  const [isClosing, setIsClosing] = useState(false);

  const closePosition = useCallback(async (agentId: string, position: LivePosition) => {
    setIsClosing(true);
    try {
      const response = await fetch(
        `${API_URL}/api/v1/agent-positions/${agentId}/${position.id}/close`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session?.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reason: 'manual',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to close position: ${response.status}`);
      }

      // Show success toast
      toast({
        title: 'Position Closed',
        description: `Successfully closed position for ${position.tokenSymbol}`,
      });
    } catch (error) {
      console.error('Error closing position:', error);
      toast({
        title: 'Error Closing Position',
        description: error instanceof Error ? error.message : 'Failed to close position. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsClosing(false);
    }
  }, [session?.accessToken, toast]);

  return {
    closePosition,
    isClosing,
  };
}

