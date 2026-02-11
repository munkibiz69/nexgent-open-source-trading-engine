/**
 * Shared Contexts
 * 
 * Barrel export for all context providers and hooks.
 * 
 * @module shared/contexts
 */

// Context Providers
export { AgentSelectionProvider, useAgentSelection } from './agent-selection.context';
export { CurrencyProvider, useCurrency } from './currency.context';
export { TradingModeProvider, useTradingMode } from './trading-mode.context';
export { UserProvider, useUser } from './user.context';
export { WalletProvider, useWallet } from './wallet.context';

// Types
export type { AgentSelectionContextType } from './agent-selection.context';
export type { User, UserContextType } from './user.context';
export type { AgentWallet } from './wallet.context';

