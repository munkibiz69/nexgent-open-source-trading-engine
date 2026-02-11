/**
 * Authentication utilities
 * 
 * Helper functions for authentication-related operations.
 * 
 * @module infrastructure/auth
 */

import { signIn, signOut } from 'next-auth/react';
import type { SignInResponse } from 'next-auth/react';

/**
 * Sign in with email and password
 * 
 * @param email - User email address
 * @param password - User password
 * @param redirect - Whether to redirect after successful login (default: true)
 * @returns Promise resolving to SignInResponse or undefined (when redirect is true)
 */
export async function loginWithCredentials(
  email: string,
  password: string,
  redirect = true
): Promise<SignInResponse | undefined> {
  return signIn('credentials', {
    email,
    password,
    redirect,
    callbackUrl: redirect ? '/dashboard' : undefined,
  });
}

/**
 * Sign out the current user
 * 
 * @param redirect - Whether to redirect after logout (default: true)
 * @returns Promise
 */
export async function logout(redirect = true): Promise<void> {
  await signOut({
    redirect,
    callbackUrl: redirect ? '/login' : undefined,
  });
}

/**
 * Check if an error is an authentication error
 * 
 * @param error - Error object
 * @returns True if error is related to authentication
 */
export function isAuthError(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('CredentialsSignin') ||
      error.message.includes('unauthorized') ||
      error.message.includes('authentication')
    );
  }
  return false;
}

/**
 * Get user-friendly error message from authentication error
 * 
 * @param error - Error object
 * @returns User-friendly error message
 */
export function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes('CredentialsSignin')) {
      return 'Invalid email or password';
    }
    if (error.message.includes('unauthorized')) {
      return 'You are not authorized to perform this action';
    }
    return error.message;
  }
  return 'An error occurred during authentication';
}

