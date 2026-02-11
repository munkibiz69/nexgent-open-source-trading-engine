/**
 * Rate Limiting Middleware
 * 
 * Simple in-memory rate limiter for API endpoints.
 * For production, consider using Redis-based rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest } from './auth.js';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

/**
 * Simple in-memory rate limit store
 * Key format: `${ip}:${path}`
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Clean up expired entries every 5 minutes
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Create rate limiting middleware
 * 
 * @param maxRequests - Maximum number of requests
 * @param windowMs - Time window in milliseconds
 * @param message - Custom error message (optional)
 * @returns Express middleware
 */
export function rateLimiter(
  maxRequests: number = 10,
  windowMs: number = 60 * 1000, // 1 minute default
  message?: string
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${ip}:${req.path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry or check if window has reset
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        error: message || 'Too many requests',
        retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Rate limiter specifically for wallet operations (stricter limits)
 * 5 requests per minute per IP
 */
export const walletRateLimiter = rateLimiter(5, 60 * 1000, 'Too many wallet operations. Please try again later.');

/**
 * Create rate limiting middleware for API key authenticated requests
 * 
 * Keys by API key ID instead of IP for more accurate per-key limiting.
 * Falls back to IP if no API key ID is present.
 * 
 * @param maxRequests - Maximum number of requests (default: 120)
 * @param windowMs - Time window in milliseconds (default: 1 minute)
 * @param message - Custom error message (optional)
 * @returns Express middleware
 */
export function apiKeyRateLimiter(
  maxRequests: number = 120,
  windowMs: number = 60 * 1000,
  message?: string
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Key by API key ID if available, otherwise fall back to IP
    const identifier = req.apiKeyId 
      ? `apikey:${req.apiKeyId}` 
      : `ip:${req.ip || req.socket.remoteAddress || 'unknown'}`;
    const key = `${identifier}:${req.path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    // Create new entry or check if window has reset
    if (!entry || entry.resetTime < now) {
      entry = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, entry);
      return next();
    }

    // Increment count
    entry.count++;

    // Check if limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.status(429).json({
        error: message || 'Too many requests',
        retryAfter,
      });
      return;
    }

    next();
  };
}

/**
 * Pre-configured API key rate limiter for trading signals
 * 120 requests per minute per API key
 */
export const signalsApiKeyRateLimiter = apiKeyRateLimiter(
  120,
  60 * 1000,
  'Rate limit exceeded. Maximum 120 requests per minute.'
);
