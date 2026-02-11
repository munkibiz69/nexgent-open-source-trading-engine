/**
 * Authentication middleware for Express
 * 
 * Provides middleware functions to protect routes and authenticate users.
 * Extracts and verifies JWT tokens from Authorization headers.
 * Includes token blacklist checking for immediate logout invalidation.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/shared/utils/auth/jwt.js';
import { redisTokenService } from '@/infrastructure/cache/redis-token-service.js';
import type { AuthenticatedUser } from '@/shared/utils/auth/types.js';

/**
 * Extended Express Request interface with authenticated user
 */
export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
  /** Set when authenticated via API key */
  apiKeyId?: string;
}

/**
 * Authentication middleware
 * 
 * Verifies JWT token from Authorization header and attaches user to request.
 * Also checks if the token has been blacklisted (logged out).
 * Returns 401 Unauthorized if token is missing, invalid, expired, or revoked.
 * 
 * Usage:
 * ```typescript
 * app.get('/protected', authenticate, (req, res) => {
 *   // req.user is guaranteed to exist here
 *   res.json({ user: req.user });
 * });
 * ```
 */
export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Wrap async logic to maintain Express middleware signature
  authenticateAsync(req, res, next).catch((error) => {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  });
}

/**
 * Internal async authentication logic
 */
async function authenticateAsync(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Authorization header required' });
      return;
    }

    // Check for Bearer token format
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      res.status(401).json({ error: 'Invalid authorization header format' });
      return;
    }

    const token = parts[1];

    // Verify token signature and structure
    const payload = verifyToken(token);

    // Ensure this is an access token (not a refresh token)
    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Check if token is blacklisted (logged out)
    if (payload.jti) {
      const isBlacklisted = await redisTokenService.isAccessTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }
    }

    // Attach user to request
    req.user = {
      id: payload.userId,
      email: payload.email,
    };

    next();
  } catch (error) {
    // Handle different error types
    if (error instanceof Error) {
      if (error.message === 'Token expired') {
        res.status(401).json({ error: 'Token expired' });
        return;
      }
      if (error.message === 'Invalid token') {
        res.status(401).json({ error: 'Invalid token' });
        return;
      }
    }

    res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional authentication middleware
 * 
 * Similar to authenticate(), but does not return 401 if token is missing.
 * Useful for routes that work for both authenticated and unauthenticated users.
 * Also checks blacklist for provided tokens.
 * 
 * Usage:
 * ```typescript
 * app.get('/public-or-private', optionalAuth, (req, res) => {
 *   if (req.user) {
 *     // User is authenticated
 *   } else {
 *     // User is not authenticated
 *   }
 * });
 * ```
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Wrap async logic to maintain Express middleware signature
  optionalAuthAsync(req, res, next).catch(() => {
    // On error, continue without authentication
    next();
  });
}

/**
 * Internal async optional authentication logic
 */
async function optionalAuthAsync(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      // No token provided, continue without authentication
      next();
      return;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      // Invalid format, continue without authentication
      next();
      return;
    }

    const token = parts[1];
    const payload = verifyToken(token);

    if (payload.type === 'access') {
      // Check if token is blacklisted
      if (payload.jti) {
        const isBlacklisted = await redisTokenService.isAccessTokenBlacklisted(payload.jti);
        if (isBlacklisted) {
          // Token is revoked, continue without authentication
          next();
          return;
        }
      }

      req.user = {
        id: payload.userId,
        email: payload.email,
      };
    }

    next();
  } catch {
    // If token verification fails, continue without authentication
    // This allows the route to handle unauthenticated requests
    next();
  }
}
