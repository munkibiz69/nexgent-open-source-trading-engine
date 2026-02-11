/**
 * Position feature types
 * 
 * Type definitions specific to the positions feature module.
 */

// Import and re-export LivePosition from agents feature (positions depend on agents)
import type { LivePosition } from '@/features/agents/types/agent.types';
export type { LivePosition };

/**
 * Props for live positions table component
 */
export interface LivePositionsTableProps {
  positions: LivePosition[];
  isConnected: boolean;
  isConnecting: boolean;
  connectionError: string | null;
}

/**
 * Props for close position dialog
 */
export interface ClosePositionDialogProps {
  position: LivePosition | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  isClosing: boolean;
}

/**
 * Props for position detail dialog
 */
export interface PositionDetailDialogProps {
  position: LivePosition | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onClosePosition: () => void;
  currencyPreference: 'USD' | 'SOL';
  solPrice: number;
}

