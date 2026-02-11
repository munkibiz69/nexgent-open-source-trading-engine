/**
 * List API keys endpoint
 * 
 * GET /api/v1/api-keys
 * 
 * Lists all API keys for the authenticated user.
 * The raw key is never returned after creation.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { ApiKeyListResponse, ApiKeyResponse } from '../types.js';

/**
 * List all API keys for the authenticated user
 * 
 * Returns: { items: [{ id, name, prefix, scopes, createdAt }] }
 */
export async function listApiKeys(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const apiKeys = await prisma.apiKey.findMany({
      where: {
        userId: req.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const items: ApiKeyResponse[] = apiKeys.map((key) => ({
      id: key.id,
      name: key.name,
      prefix: key.keyPrefix,
      scopes: key.scopes,
      createdAt: key.createdAt,
    }));

    const response: ApiKeyListResponse = { items };

    res.json(response);
  } catch (error) {
    console.error('List API keys error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
