/**
 * Transactions Feature Module
 * 
 * This module exports all transaction-related components, hooks, and types.
 * 
 * @module features/transactions
 */

// Components
export { TransactionDetailDialog } from './components/transaction-detail-dialog/transaction-detail-dialog';

// Hooks
export {
  useTransaction,
  useTransactions,
} from './hooks/use-transactions';

// Types
export type {
  TransactionDetailDialogProps,
  TransactionTypeFilter,
} from './types/transaction.types';
