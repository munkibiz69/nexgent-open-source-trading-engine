/**
 * Trades Feature Module
 * 
 * This module exports all trade-related components, hooks, and types.
 * 
 * @module features/trades
 */

// Components
export { RecentTradesTable } from './components/recent-trades-table/recent-trades-table';
export { TradeDetailDialog } from './components/trade-detail-dialog/trade-detail-dialog';

// Hooks
export {
  useHistoricalSwaps,
  useHistoricalSwap,
} from './hooks/use-historical-swaps';

// Types
export type {
  RecentTradesTableProps,
  TradeDetailDialogProps,
  TradeSortOption,
} from './types/trade.types';
