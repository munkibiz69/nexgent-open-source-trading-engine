/**
 * useAuth hook
 * 
 * Provides authentication state and utilities.
 */

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';
import { logout as logoutUtil } from '@/infrastructure/auth/auth.utils';

export function useAuth() {
  const { data: session, status } = useSession();

  const logout = useCallback(async () => {
    await logoutUtil();
  }, []);

  return {
    user: session?.user,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    isUnauthenticated: status === 'unauthenticated',
    logout,
  };
}

