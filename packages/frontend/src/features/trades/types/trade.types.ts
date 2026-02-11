/**
 * Trade feature types
 * 
 * Type definitions specific to the trades feature module.
 */

import type { AgentHistoricalSwap } from '@/shared/types/api.types';

/**
 * Props for recent trades table component
 */
export interface RecentTradesTableProps {
  // Component doesn't take props, uses context internally
}

/**
 * Props for trade detail dialog
 */
export interface TradeDetailDialogProps {
  swap: AgentHistoricalSwap | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currencyPreference: 'USD' | 'SOL';
  solPrice: number;
}

/**
 * Sort options for trades
 */
export type TradeSortOption = 'most_recent' | 'highest_profit' | 'biggest_loss';

