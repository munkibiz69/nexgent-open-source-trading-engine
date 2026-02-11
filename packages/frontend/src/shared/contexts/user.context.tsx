/**
 * User Context
 * 
 * Provides user authentication state throughout the application.
 * Reads user data from NextAuth session and makes it available via context.
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useSession } from 'next-auth/react';

/**
 * User information from the authenticated session
 */
export interface User {
  /** Unique user identifier */
  id: string;
  /** User's email address */
  email: string;
}

/**
 * User context value
 */
export interface UserContextType {
  /** Current user, or null if not authenticated */
  user: User | null;
  /** Whether user data is currently loading */
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * UserProvider - Provides user authentication state to the application
 * 
 * Reads user data from NextAuth session and makes it available via context.
 * Automatically updates when the session changes (login/logout).
 * 
 * @param children - Child components to wrap
 * 
 * @example
 * ```tsx
 * <UserProvider>
 *   <App />
 * </UserProvider>
 * ```
 */
export function UserProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();

  const value: UserContextType = {
    user: session?.user
      ? {
          id: session.user.id,
          email: session.user.email || '',
        }
      : null,
    loading: status === 'loading',
  };

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * useUser - Hook to access user context
 * 
 * @returns User context value with current user and loading state
 * @throws Error if used outside UserProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { user, loading } = useUser();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please log in</div>;
 *   
 *   return <div>Welcome, {user.email}!</div>;
 * }
 * ```
 */
export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within UserProvider');
  }
  return context;
}

