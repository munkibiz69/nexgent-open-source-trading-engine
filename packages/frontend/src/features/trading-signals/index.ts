/**
 * Trading Signals Feature Module
 * 
 * This module exports all trading signal-related components, hooks, and types.
 * 
 * @module features/trading-signals
 */

// Components
export { TradingSignalsTable, type TradingSignalSortOption } from './components/trading-signals-table/trading-signals-table';
export { TradingSignalDetailDialog } from './components/trading-signal-detail-dialog/trading-signal-detail-dialog';
export { TradingSignalsInfo } from './components/trading-signals-info/trading-signals-info';

// Hooks
export {
  useTradingSignals,
  useTradingSignal,
} from './hooks/use-trading-signals';
export { useExportSignals } from './hooks/use-export-signals';

// Types
export type {
  TradingSignalsTableProps,
  TradingSignalDetailDialogProps,
  TradingSignalsQueryParams,
} from './types/trading-signal.types';
