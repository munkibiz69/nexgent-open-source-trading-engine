'use client';

/**
 * useRegister hook
 * 
 * Handles user registration with email and password.
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/infrastructure/api/client/api-client';
import { signIn } from 'next-auth/react';
import type { UseRegisterReturn } from '../types/auth.types';

/**
 * Hook for handling user registration
 * 
 * @returns Register function, loading state, and error state
 */
export function useRegister(): UseRegisterReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const register = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Call backend register endpoint
        const response = await apiClient.post('/api/v1/auth/register', {
          email,
          password,
        });

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || 'Failed to create account');
          return;
        }

        // After successful registration, automatically sign in
        const signInResult = await signIn('credentials', {
          email,
          password,
          redirect: false,
        });

        if (signInResult?.error) {
          setError('Account created but failed to sign in. Please try logging in.');
          return;
        }

        if (signInResult?.ok) {
          // Redirect to performance overview on success
          router.push('/dashboard/performance-overview');
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An error occurred during registration'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [router]
  );

  return { register, isLoading, error };
}

