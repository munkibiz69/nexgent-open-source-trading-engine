/**
 * App Providers
 * 
 * Composes all root-level providers for the application.
 * This includes third-party library providers (NextAuth, React Query)
 * and should wrap the entire application at the root level.
 * 
 * @module shared/providers
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { type ReactNode } from 'react';
import { QueryProvider } from './query-provider';

/**
 * AppProviders component
 * 
 * Wraps the application with all necessary root-level providers.
 * Currently includes:
 * - SessionProvider (NextAuth.js) - Authentication state
 * - QueryProvider (React Query) - Server state management
 * 
 * This should be used at the root layout level.
 * 
 * @param children - Child components to wrap
 * 
 * @example
 * ```tsx
 * // app/layout.tsx
 * <AppProviders>
 *   {children}
 * </AppProviders>
 * ```
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    // Disable session refetch on window focus to prevent WebSocket disconnections
    // when user returns to the tab. Token refresh happens on API calls instead.
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryProvider>{children}</QueryProvider>
    </SessionProvider>
  );
}

