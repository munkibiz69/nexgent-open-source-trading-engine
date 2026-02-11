/**
 * User registration endpoint
 * 
 * POST /api/auth/register
 * 
 * Creates a new user account with email and password.
 * Validates input, checks for existing users, hashes password,
 * and returns authentication tokens.
 */

import { Request, Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import { hashPassword, validatePasswordStrength } from '@/shared/utils/auth/password.js';
import { generateAccessToken, generateRefreshToken } from '@/shared/utils/auth/jwt.js';
import { redisTokenService } from '@/infrastructure/cache/redis-token-service.js';
import type { RegisterRequest, AuthResponse } from '@/shared/utils/auth/types.js';

/**
 * Register a new user
 * 
 * Body: { email: string, password: string }
 * Returns: { accessToken, refreshToken, user }
 */
export async function register(req: Request, res: Response) {
  try {
    const { email, password }: RegisterRequest = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required',
      });
    }

    // Validate email format (basic validation)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
      });
    }

    // Validate password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        error: 'Password does not meet requirements',
        details: passwordValidation.errors,
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      // Generic error message to prevent email enumeration
      return res.status(400).json({
        error: 'Unable to create account',
      });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email);
    const { token: refreshToken, jti, expiresInSeconds } = generateRefreshToken(
      user.id,
      user.email,
      false
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

    res.status(201).json(response);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

