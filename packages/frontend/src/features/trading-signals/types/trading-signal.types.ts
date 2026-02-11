/**
 * Trading Signals feature types
 * 
 * Type definitions specific to the trading signals feature module.
 */

import type { TradingSignal } from '@/shared/types/api.types';

/**
 * Props for trading signals table component
 */
export interface TradingSignalsTableProps {
  signals: TradingSignal[];
  isLoading?: boolean;
  onSignalClick?: (signal: TradingSignal) => void;
}

/**
 * Props for trading signal detail dialog
 */
export interface TradingSignalDetailDialogProps {
  signal: TradingSignal | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Trading signals query parameters
 */
export interface TradingSignalsQueryParams {
  limit?: number;
  offset?: number;
  tokenAddress?: string;
  signalType?: string;
  startDate?: string;
  endDate?: string;
}

