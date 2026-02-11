/**
 * User information endpoint
 * 
 * GET /api/auth/me
 * 
 * Returns information about the currently authenticated user.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Get current authenticated user information
 * 
 * Headers: Authorization: Bearer <accessToken>
 * Returns: { id, email, createdAt }
 */
export async function me(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Fetch fresh user data from database
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        error: 'User not found',
      });
    }

    res.json({
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    });
  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

