/**
 * Get API key endpoint
 * 
 * GET /api/v1/api-keys/:id
 * 
 * Gets details of a specific API key for the authenticated user.
 * The raw key is never returned after creation.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { ApiKeyResponse } from '../types.js';

/**
 * Get a specific API key
 * 
 * Params: { id: string }
 * Returns: { id, name, prefix, scopes, createdAt }
 */
export async function getApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { id } = req.params;

    // Validate ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(id)) {
      return res.status(400).json({
        error: 'Invalid API key ID format',
      });
    }

    const apiKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only access their own keys
      },
    });

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    const response: ApiKeyResponse = {
      id: apiKey.id,
      name: apiKey.name,
      prefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };

    res.json(response);
  } catch (error) {
    console.error('Get API key error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
