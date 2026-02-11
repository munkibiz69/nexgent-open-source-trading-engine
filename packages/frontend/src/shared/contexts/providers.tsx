/**
 * Context Providers Composition
 * 
 * Composes all context providers in the correct hierarchy.
 * This ensures proper dependency order and optimizes provider nesting.
 * 
 * Provider Hierarchy:
 * 1. UserProvider - Base provider, no dependencies
 * 2. AgentSelectionProvider - Depends on UserProvider
 * 3. CurrencyProvider - Independent, can be anywhere
 * 4. TradingModeProvider - Depends on AgentSelectionProvider
 * 5. WalletProvider - Depends on TradingModeProvider and UserProvider
 * 
 * @module shared/contexts/providers
 */

'use client';

import { ReactNode } from 'react';
import { UserProvider } from './user.context';
import { AgentSelectionProvider } from './agent-selection.context';
import { CurrencyProvider } from './currency.context';
import { TradingModeProvider } from './trading-mode.context';
import { WalletProvider } from './wallet.context';

/**
 * Props for AppProviders component
 */
export interface AppProvidersProps {
  /** Child components to wrap with providers */
  children: ReactNode;
}

/**
 * AppProviders component
 * 
 * Composes all context providers in the correct order.
 * This component should wrap the root of your application.
 * 
 * @example
 * ```tsx
 * <AppProviders>
 *   <App />
 * </AppProviders>
 * ```
 */
export function AppProviders({ children }: AppProvidersProps) {
  return (
    <UserProvider>
      <AgentSelectionProvider>
        <CurrencyProvider>
          <TradingModeProvider>
            <WalletProvider>
              {children}
            </WalletProvider>
          </TradingModeProvider>
        </CurrencyProvider>
      </AgentSelectionProvider>
    </UserProvider>
  );
}

