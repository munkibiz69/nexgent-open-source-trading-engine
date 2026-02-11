/**
 * Transaction feature types
 * 
 * Type definitions specific to the transactions feature module.
 */

import type { AgentTransaction } from '@/shared/types/api.types';

/**
 * Props for transaction detail dialog
 */
export interface TransactionDetailDialogProps {
  transaction: AgentTransaction | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  solPrice: number;
}

/**
 * Transaction type filter options
 */
export type TransactionTypeFilter = 'all' | 'DEPOSIT' | 'SWAP' | 'BURN';

/**
 * Swap info from Jupiter route
 */
export interface SwapInfo {
  ammKey?: string;
  label?: string;
  inputMint?: string;
  outputMint?: string;
  inAmount?: string;
  outAmount?: string;
  feeAmount?: string;
  feeMint?: string;
}

/**
 * Route plan step
 */
export interface RoutePlanStep {
  swapInfo?: SwapInfo;
  percent?: number;
}

/**
 * Transaction routes data
 */
export interface TransactionRoutes {
  routePlan?: RoutePlanStep[];
  contextSlot?: number;
  timeTaken?: number;
}

