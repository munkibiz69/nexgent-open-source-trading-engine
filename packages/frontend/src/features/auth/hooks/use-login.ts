'use client';

/**
 * useLogin hook
 * 
 * Handles user login with email and password.
 */

import { useState, useCallback } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { getAuthErrorMessage } from '@/infrastructure/auth/auth.utils';
import type { UseLoginReturn } from '../types/auth.types';

/**
 * Hook for handling user login
 * 
 * @returns Login function, loading state, and error state
 */
export function useLogin(): UseLoginReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const login = useCallback(
    async (email: string, password: string, rememberMe: boolean = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await signIn('credentials', {
          email,
          password,
          rememberMe,
          redirect: false,
        });

        if (result?.error) {
          setError(getAuthErrorMessage(new Error(result.error)));
          return;
        }

        if (result?.ok) {
          // Redirect to performance overview on success
          router.push('/dashboard/performance-overview');
        }
      } catch (err) {
        setError(getAuthErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { login, isLoading, error };
}

