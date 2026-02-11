/**
 * User login endpoint
 * 
 * POST /api/auth/login
 * 
 * Authenticates a user with email and password.
 * Implements account lockout, prevents timing attacks,
 * and returns authentication tokens.
 */

import { Request, Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import { verifyPassword } from '@/shared/utils/auth/password.js';
import {
  generateAccessToken,
  generateRefreshToken,
} from '@/shared/utils/auth/jwt.js';
import {
  isAccountLocked,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '@/shared/utils/auth/account-lockout.js';
import { redisTokenService } from '@/infrastructure/cache/redis-token-service.js';
import type { LoginRequest, AuthResponse } from '@/shared/utils/auth/types.js';

/**
 * Authenticate user and return tokens
 * 
 * Body: { email: string, password: string, rememberMe?: boolean }
 * Returns: { accessToken, refreshToken, user }
 */
export async function login(req: Request, res: Response) {
  try {
    const { email, password, rememberMe = false }: LoginRequest & {
      rememberMe?: boolean;
    } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        createdAt: true,
        failedLoginAttempts: true,
        lockedUntil: true,
      },
    });

    // Generic error message to prevent email enumeration
    // Always perform password verification to prevent timing attacks
    const genericError = {
      error: 'Invalid email or password',
    };

    if (!user || !user.passwordHash) {
      // Simulate password verification time to prevent timing attacks
      await verifyPassword(
        'dummy',
        '$2b$12$dummy.hash.to.prevent.timing.attack'
      );
      return res.status(401).json(genericError);
    }

    // Check if account is locked
    if (isAccountLocked(user)) {
      return res.status(423).json({
        error:
          'Account is temporarily locked due to too many failed login attempts',
        lockedUntil: user.lockedUntil,
      });
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      await incrementFailedAttempts(user.id);

      return res.status(401).json(genericError);
    }

    // Reset failed attempts on successful login
    await resetFailedAttempts(user.id);

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const { token: refreshToken, jti, expiresInSeconds } = generateRefreshToken(
      user.id,
      user.email,
      rememberMe
    );

    // Store refresh token in Redis for rotation tracking
    await redisTokenService.storeRefreshToken(jti, user.id, expiresInSeconds);

    const response: AuthResponse = {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

