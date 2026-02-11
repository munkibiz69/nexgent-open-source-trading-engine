/**
 * JWT token generation and verification
 * 
 * Handles creation and validation of JWT tokens for authentication.
 * Implements access tokens (short-lived) and refresh tokens (long-lived)
 * with proper expiration and security.
 */

import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { JWTPayload, RefreshTokenResult } from '@/shared/utils/auth/types.js';

// Pin the signing algorithm to prevent algorithm confusion attacks.
// All tokens are signed with HS256; verification rejects any other algorithm.
const JWT_ALGORITHM = 'HS256' as const;

// Token expiration constants
const ACCESS_TOKEN_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '24h';
const REFRESH_TOKEN_REMEMBER_EXPIRES_IN = '30d';

/**
 * Gets and validates the JWT secret
 * 
 * Lazy-loads the secret to allow dotenv to load before validation.
 * Throws an error if secret is missing or too short.
 * Warns if using the example value from env.example.
 * 
 * @returns JWT secret string
 * @throws Error if secret is missing or invalid
 */
function getSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security'
    );
  }

  // Reject the example value from env.example — it is publicly known and must never be used
  if (secret === 'your-strong-random-secret-key-minimum-32-characters-long') {
    const message =
      'JWT_SECRET is using the example value from env.example! ' +
      'This is publicly known and insecure. ' +
      'Generate a secure secret: pnpm generate-secret';

    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    }

    // In development / test, warn loudly but allow startup
    console.warn(`\n⚠️  ${message}\n`);
  }

  return secret;
}

/**
 * Generates a JWT access token
 * 
 * Access tokens are short-lived (default 15 minutes) and used for
 * authenticating API requests. They should be stored in memory or
 * secure storage on the client. Each token has a unique ID (jti)
 * to support blacklisting on logout.
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @returns JWT access token string
 */
export function generateAccessToken(userId: string, email: string): string {
  const jti = randomUUID();
  
  const payload: JWTPayload = {
    userId,
    email,
    type: 'access',
    jti,
  };

  return jwt.sign(payload, getSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  } as SignOptions);
}

/**
 * Generates a JWT refresh token
 * 
 * Refresh tokens are long-lived (default 24 hours) and used to obtain
 * new access tokens. Each token has a unique ID (jti) for tracking
 * and revocation on logout. Supports "remember me" functionality
 * with extended expiration.
 * 
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param rememberMe - Whether to use extended expiration (30 days)
 * @returns Object containing token, jti, and expiresInSeconds for Redis storage
 */
export function generateRefreshToken(
  userId: string,
  email: string,
  rememberMe: boolean = false
): RefreshTokenResult {
  const jti = randomUUID();
  
  const payload: JWTPayload = {
    userId,
    email,
    type: 'refresh',
    jti,
  };

  const expiresIn = rememberMe
    ? REFRESH_TOKEN_REMEMBER_EXPIRES_IN
    : REFRESH_TOKEN_EXPIRES_IN;

  // Calculate TTL in seconds for Redis storage
  const expiresInSeconds = rememberMe
    ? 30 * 24 * 60 * 60  // 30 days in seconds
    : 24 * 60 * 60;       // 24 hours in seconds

  const token = jwt.sign(payload, getSecret(), {
    algorithm: JWT_ALGORITHM,
    expiresIn: expiresIn,
  } as SignOptions);

  return { token, jti, expiresInSeconds };
}

/**
 * Verifies a JWT token and returns the payload
 * 
 * Validates the token signature, expiration, and structure.
 * Throws an error if the token is invalid, expired, or malformed.
 * 
 * @param token - JWT token string to verify
 * @returns Decoded token payload
 * @throws Error if token is invalid, expired, or malformed
 */
export function verifyToken(token: string): JWTPayload {
  try {
    const decoded = jwt.verify(token, getSecret(), {
      algorithms: [JWT_ALGORITHM],
    } as VerifyOptions);

    // Validate decoded payload structure
    if (
      typeof decoded !== 'object' ||
      decoded === null ||
      !('userId' in decoded) ||
      !('email' in decoded) ||
      !('type' in decoded)
    ) {
      throw new Error('Invalid token structure');
    }

    const payload = decoded as JWTPayload;

    // Additional validation
    if (!payload.userId || !payload.email || !payload.type) {
      throw new Error('Invalid token structure');
    }

    return payload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    throw error;
  }
}

/**
 * Extracts user ID from a JWT token without full verification
 * 
 * Note: This does not verify the token signature. Use verifyToken()
 * for secure verification. This is useful for logging or debugging
 * purposes only.
 * 
 * @param token - JWT token string
 * @returns User ID if token is decodable, null otherwise
 */
export function extractUserId(token: string): string | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded?.userId || null;
  } catch {
    return null;
  }
}

/**
 * Extracts token type (access or refresh) from a JWT token
 * 
 * @param token - JWT token string
 * @returns Token type if decodable, null otherwise
 */
export function extractTokenType(token: string): 'access' | 'refresh' | null {
  try {
    const decoded = jwt.decode(token) as JWTPayload | null;
    return decoded?.type || null;
  } catch {
    return null;
  }
}

