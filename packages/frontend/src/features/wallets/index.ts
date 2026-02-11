/**
 * Wallets Feature Module
 * 
 * This module exports all wallet-related components, hooks, and types.
 * 
 * @module features/wallets
 */

// Components
export { WalletDepositDialog } from './components/wallet-dialogs/wallet-deposit-dialog';
export { WalletResetDialog } from './components/wallet-dialogs/wallet-reset-dialog';
export { WalletAssignDialog } from './components/wallet-dialogs/wallet-assign-dialog';
export { WalletUnassignDialog } from './components/wallet-dialogs/wallet-unassign-dialog';

// Hooks
export { useWallets } from './hooks/use-wallets';

// Types
export type {
  WalletDepositDialogProps,
  WalletResetDialogProps,
  WalletAssignDialogProps,
  WalletUnassignDialogProps,
} from './types/wallet.types';
