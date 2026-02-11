/**
 * Authentication Types
 * 
 * Re-exported from shared package
 */

import { AuthUser } from '@nexgent/shared';

export type {
  RegisterRequest,
  LoginRequest,
  RefreshTokenRequest,
  AuthUser,
  AuthResponse
} from '@nexgent/shared';

// Backend-specific auth types
export interface JWTPayload {
  userId: string;
  email: string;
  type: 'access' | 'refresh';
  jti?: string; // JWT ID - unique identifier for refresh tokens (used for rotation)
  iat?: number;
  exp?: number;
}

/**
 * Result from generateRefreshToken
 * Includes the token, its unique ID, and TTL for Redis storage
 */
export interface RefreshTokenResult {
  token: string;
  jti: string;
  expiresInSeconds: number;
}

export type AuthenticatedUser = AuthUser;

export interface PasswordValidationResult {
    valid: boolean;
    message?: string;
}

export interface AccountLockoutInfo {
    isLocked: boolean;
    lockoutUntil?: Date;
    remainingAttempts?: number;
}
