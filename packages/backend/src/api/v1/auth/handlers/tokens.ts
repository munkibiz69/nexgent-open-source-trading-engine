/**
 * Token management endpoints
 * 
 * Handles token refresh and logout functionality.
 */

import { Request, Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import { verifyToken, generateAccessToken } from '@/shared/utils/auth/jwt.js';
import { redisTokenService } from '@/infrastructure/cache/redis-token-service.js';
import { type AuthenticatedRequest } from '@/middleware/auth.js';
import type { RefreshTokenRequest } from '@/shared/utils/auth/types.js';
import { logger } from '@/infrastructure/logging/logger.js';

/**
 * POST /api/auth/refresh
 * 
 * Refresh access token using refresh token.
 * The refresh token remains valid until it expires or is revoked on logout.
 * 
 * Body: { refreshToken: string }
 * Returns: { accessToken }
 */
export async function refresh(req: Request, res: Response) {
  try {
    const { refreshToken }: RefreshTokenRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Refresh token is required',
      });
    }

    // Step 1: Verify JWT signature and structure
    let payload;
    try {
      payload = verifyToken(refreshToken);
    } catch (_error) {
      return res.status(401).json({
        error: 'Invalid or expired refresh token',
      });
    }

    // Step 2: Ensure this is a refresh token
    if (payload.type !== 'refresh') {
      return res.status(401).json({
        error: 'Invalid token type',
      });
    }

    // Step 3: Validate jti exists
    if (!payload.jti) {
      logger.warn({ userId: payload.userId }, 'Refresh attempt with legacy token (no jti)');
      return res.status(401).json({
        error: 'Invalid refresh token format. Please log in again.',
      });
    }

    // Step 4: Validate token exists in Redis (not revoked)
    const userId = await redisTokenService.validateRefreshToken(payload.jti);
    
    if (!userId) {
      // Token was revoked (e.g., on logout)
      logger.warn({ 
        jti: payload.jti, 
        userId: payload.userId 
      }, 'Refresh attempt with revoked token');
      
      return res.status(401).json({
        error: 'Refresh token has been revoked',
      });
    }

    // Step 5: Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
      });
    }

    // Step 6: Generate new access token only (refresh token stays the same)
    const newAccessToken = generateAccessToken(user.id, user.email);

    logger.info({ userId: user.id }, 'Access token refreshed successfully');

    // Step 7: Return new access token
    res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    logger.error({ error }, 'Refresh error');
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

/**
 * POST /api/auth/logout
 * 
 * Logout user by revoking their tokens.
 * - Blacklists the current access token for immediate invalidation
 * - Revokes the refresh token if provided
 * 
 * Headers: Authorization: Bearer <accessToken>
 * Body (optional): { refreshToken: string }
 * Returns: { success: true }
 */
export async function logout(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    // Blacklist the current access token for immediate invalidation
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      if (token) {
        try {
          const payload = verifyToken(token);
          if (payload.jti && payload.exp) {
            // Calculate remaining TTL (token exp is in seconds)
            const now = Math.floor(Date.now() / 1000);
            const remainingTtl = payload.exp - now;
            
            if (remainingTtl > 0) {
              await redisTokenService.blacklistAccessToken(payload.jti, remainingTtl);
              logger.info({ userId: req.user?.id, jti: payload.jti, remainingTtl }, 'Access token blacklisted on logout');
            }
          }
        } catch {
          // Token is invalid/expired anyway, no need to blacklist
        }
      }
    }

    // Get refresh token from request body (optional - for explicit revocation)
    const { refreshToken } = req.body as { refreshToken?: string };
    
    if (refreshToken) {
      try {
        const payload = verifyToken(refreshToken);
        if (payload.jti) {
          // Revoke the specific refresh token
          await redisTokenService.revokeRefreshToken(payload.jti);
          logger.info({ userId: req.user?.id, jti: payload.jti }, 'Refresh token revoked on logout');
        }
      } catch {
        // Token is invalid anyway, ignore
        // This is fine - the token is either expired or malformed
      }
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error({ error }, 'Logout error');
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
