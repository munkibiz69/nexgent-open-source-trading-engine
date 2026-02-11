/**
 * Token refresh utilities
 * 
 * Handles token refresh logic and token expiration checks.
 */

import { jwtDecode } from 'jwt-decode';

interface TokenPayload {
  exp: number; // Expiration timestamp (Unix)
  iat: number; // Issued at timestamp
  userId?: string;
  email?: string;
  type?: 'access' | 'refresh';
}

/**
 * Check if a token is expired or close to expiring
 * 
 * @param token - JWT token string
 * @param bufferSeconds - Seconds before expiration to consider token "expired" (default: 300 = 5 minutes)
 * @returns True if token is expired or will expire within buffer time
 */
export function isTokenExpiring(token: string | undefined, bufferSeconds = 300): boolean {
  if (!token) return true;

  try {
    const decoded = jwtDecode<TokenPayload>(token);
    const expirationTime = decoded.exp * 1000; // Convert to milliseconds
    const bufferTime = bufferSeconds * 1000; // Convert to milliseconds
    const now = Date.now();

    return expirationTime - now < bufferTime;
  } catch {
    // If token is invalid or can't be decoded, consider it expired
    return true;
  }
}

/**
 * Refresh access token using refresh token
 * 
 * Returns a new access token. The refresh token remains valid until
 * it expires or is revoked on logout.
 * 
 * @param refreshToken - Refresh token string
 * @returns Promise resolving to new access token
 * @throws Error if refresh fails
 */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const response = await fetch(`${API_URL}/api/v1/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to refresh token' }));
    throw new Error(error.error || 'Failed to refresh token');
  }

  const data = await response.json();
  return data.accessToken;
}

