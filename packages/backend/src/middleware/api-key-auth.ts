/**
 * API Key Authentication Middleware
 * 
 * Provides middleware for authenticating requests using API keys.
 * Supports both X-API-Key header and Bearer token formats.
 */

import { Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';
import { verifyApiKey, hasScope, isApiKeyFormat } from '@/shared/utils/api-keys/index.js';
import { verifyToken } from '@/shared/utils/auth/jwt.js';
import { redisTokenService } from '@/infrastructure/cache/redis-token-service.js';

/**
 * Authenticate with API key only
 * 
 * Use this middleware for endpoints that require API key authentication.
 * Does not fall back to JWT authentication.
 * 
 * Supports two header formats:
 * - X-API-Key: nex_xxxxx
 * - Authorization: Bearer nex_xxxxx
 */
export function authenticateApiKey(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  authenticateApiKeyAsync(req, res, next).catch((error) => {
    console.error('API key authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  });
}

async function authenticateApiKeyAsync(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  const keyData = await verifyApiKey(apiKey);
  if (!keyData) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Attach user info and API key ID to request
  req.user = {
    id: keyData.userId,
    email: keyData.email,
  };
  req.apiKeyId = keyData.id;

  next();
}

/**
 * Authenticate with API key and require a specific scope
 * 
 * Use this middleware for endpoints that require both API key authentication
 * and a specific permission scope.
 * 
 * @param requiredScope - The scope required for the operation
 */
export function authenticateApiKeyWithScope(requiredScope: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    authenticateApiKeyWithScopeAsync(req, res, next, requiredScope).catch((error) => {
      console.error('API key authentication error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  };
}

async function authenticateApiKeyWithScopeAsync(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  requiredScope: string
): Promise<void> {
  const apiKey = extractApiKey(req);

  if (!apiKey) {
    res.status(401).json({ error: 'API key required' });
    return;
  }

  const keyData = await verifyApiKey(apiKey);
  if (!keyData) {
    res.status(401).json({ error: 'Invalid API key' });
    return;
  }

  // Check if key has the required scope
  if (!hasScope(keyData.scopes, requiredScope)) {
    res.status(403).json({
      error: `API key missing required scope: ${requiredScope}`,
    });
    return;
  }

  // Attach user info and API key ID to request
  req.user = {
    id: keyData.userId,
    email: keyData.email,
  };
  req.apiKeyId = keyData.id;

  next();
}

/**
 * Extract API key from request headers
 * 
 * Checks both X-API-Key header and Authorization header (Bearer format)
 * 
 * @param req - Express request object
 * @returns The API key string or null if not found
 */
function extractApiKey(req: AuthenticatedRequest): string | null {
  // Check X-API-Key header first
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && isApiKeyFormat(xApiKey)) {
    return xApiKey;
  }

  // Check Authorization header for Bearer format
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    if (isApiKeyFormat(token)) {
      return token;
    }
  }

  return null;
}

/**
 * Authenticate with either JWT or API key, with scope requirement for API keys
 * 
 * This middleware accepts both JWT tokens (from web UI) and API keys (programmatic).
 * - JWT tokens: Always granted access (equivalent to full_access)
 * - API keys: Must have the required scope
 * 
 * Use this for read-only endpoints that should be accessible via API keys.
 * 
 * @param requiredScope - The scope required for API key authentication
 */
export function authenticateWithScope(requiredScope: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    authenticateWithScopeAsync(req, res, next, requiredScope).catch((error) => {
      console.error('Authentication error:', error);
      res.status(500).json({ error: 'Internal server error' });
    });
  };
}

async function authenticateWithScopeAsync(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
  requiredScope: string
): Promise<void> {
  // First, check for API key in X-API-Key header
  const xApiKey = req.headers['x-api-key'];
  if (typeof xApiKey === 'string' && isApiKeyFormat(xApiKey)) {
    // API key authentication
    const keyData = await verifyApiKey(xApiKey);
    if (!keyData) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    // Check scope
    if (!hasScope(keyData.scopes, requiredScope)) {
      res.status(403).json({
        error: `API key missing required scope: ${requiredScope}`,
      });
      return;
    }

    req.user = {
      id: keyData.userId,
      email: keyData.email,
    };
    req.apiKeyId = keyData.id;
    next();
    return;
  }

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({ error: 'Invalid authorization header format' });
    return;
  }

  const token = parts[1];

  // Check if it's an API key in Bearer format
  if (isApiKeyFormat(token)) {
    const keyData = await verifyApiKey(token);
    if (!keyData) {
      res.status(401).json({ error: 'Invalid API key' });
      return;
    }

    if (!hasScope(keyData.scopes, requiredScope)) {
      res.status(403).json({
        error: `API key missing required scope: ${requiredScope}`,
      });
      return;
    }

    req.user = {
      id: keyData.userId,
      email: keyData.email,
    };
    req.apiKeyId = keyData.id;
    next();
    return;
  }

  // It's a JWT token - verify it
  try {
    const payload = verifyToken(token);

    if (payload.type !== 'access') {
      res.status(401).json({ error: 'Invalid token type' });
      return;
    }

    // Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await redisTokenService.isAccessTokenBlacklisted(payload.jti);
      if (isBlacklisted) {
        res.status(401).json({ error: 'Token has been revoked' });
        return;
      }
    }

    // JWT users get full access (they're authenticated via web UI)
    req.user = {
      id: payload.userId,
      email: payload.email,
    };
    next();
  } catch (error) {
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
