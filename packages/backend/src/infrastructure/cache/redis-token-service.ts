/**
 * Redis Token Service
 * 
 * Manages refresh token storage and validation.
 * Tokens are reusable until they expire or are explicitly revoked on logout.
 * 
 * @module infrastructure/cache
 */

import { redisService } from './redis-client.js';

// Key patterns
const REFRESH_TOKEN_PREFIX = 'refresh_token:';  // refresh_token:{jti} → userId
const BLACKLIST_PREFIX = 'blacklist:';          // blacklist:{jti} → "1"

export class RedisTokenService {
  private static instance: RedisTokenService;

  public static getInstance(): RedisTokenService {
    if (!RedisTokenService.instance) {
      RedisTokenService.instance = new RedisTokenService();
    }
    return RedisTokenService.instance;
  }

  /**
   * Store a refresh token
   * 
   * @param jti - JWT ID (unique identifier)
   * @param userId - User ID the token belongs to
   * @param ttlSeconds - Time to live (should match token expiration)
   */
  async storeRefreshToken(jti: string, userId: string, ttlSeconds: number): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}${jti}`;
    await redisService.set(key, userId, ttlSeconds);
  }

  /**
   * Validate a refresh token exists in Redis
   * 
   * Checks if token exists and returns the userId.
   * Token remains valid for reuse until it expires or is explicitly revoked.
   * 
   * @param jti - JWT ID to validate
   * @returns userId if valid, null if token doesn't exist or was revoked
   */
  async validateRefreshToken(jti: string): Promise<string | null> {
    const key = `${REFRESH_TOKEN_PREFIX}${jti}`;
    const client = redisService.getClient();
    return await client.get(key);
  }

  /**
   * Revoke a specific refresh token
   * Used for logout or manual revocation
   * 
   * @param jti - JWT ID to revoke
   */
  async revokeRefreshToken(jti: string): Promise<void> {
    const key = `${REFRESH_TOKEN_PREFIX}${jti}`;
    await redisService.del(key);
  }

  /**
   * Revoke all refresh tokens for a user
   * Used for "logout all devices" functionality
   * 
   * Note: This requires scanning keys, which can be slow for large datasets.
   * Consider using a user-to-tokens set for better performance in high-scale scenarios.
   * 
   * @param userId - User ID to revoke all tokens for
   */
  async revokeAllUserTokens(userId: string): Promise<number> {
    const client = redisService.getClient();
    const pattern = `${REFRESH_TOKEN_PREFIX}*`;
    let revokedCount = 0;
    
    // Use SCAN to iterate through keys (non-blocking)
    let cursor = '0';
    do {
      const [newCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = newCursor;
      
      // Check each key's value and delete if it belongs to this user
      for (const key of keys) {
        const value = await client.get(key);
        if (value === userId) {
          await client.del(key);
          revokedCount++;
        }
      }
    } while (cursor !== '0');

    return revokedCount;
  }

  // ============================================
  // Access Token Blacklisting (for logout)
  // ============================================

  /**
   * Add an access token to the blacklist
   * 
   * Called on logout to immediately invalidate the access token.
   * TTL is set to the token's remaining lifetime (no point blacklisting
   * longer than the token would be valid anyway).
   * 
   * @param jti - JWT ID of the access token
   * @param ttlSeconds - Time until token would naturally expire
   */
  async blacklistAccessToken(jti: string, ttlSeconds: number): Promise<void> {
    if (ttlSeconds <= 0) {
      // Token already expired, no need to blacklist
      return;
    }
    const key = `${BLACKLIST_PREFIX}${jti}`;
    await redisService.set(key, '1', ttlSeconds);
  }

  /**
   * Check if an access token is blacklisted
   * 
   * Called by auth middleware on every authenticated request.
   * 
   * @param jti - JWT ID to check
   * @returns true if blacklisted (should reject), false otherwise
   */
  async isAccessTokenBlacklisted(jti: string): Promise<boolean> {
    const key = `${BLACKLIST_PREFIX}${jti}`;
    return await redisService.exists(key);
  }
}

export const redisTokenService = RedisTokenService.getInstance();
