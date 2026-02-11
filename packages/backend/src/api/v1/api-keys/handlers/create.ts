/**
 * Create API key endpoint
 * 
 * POST /api/v1/api-keys
 * 
 * Creates a new API key for the authenticated user.
 * The raw key is returned only once in the response.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { CreateApiKeyRequest, ApiKeyCreatedResponse } from '../types.js';
import { generateApiKey } from '@/shared/utils/api-keys/index.js';

/**
 * Create a new API key
 * 
 * Body: { name: string, scopes: string[] }
 * Returns: { id, name, key, prefix, scopes, createdAt }
 */
export async function createApiKey(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    const { name, scopes }: CreateApiKeyRequest = req.body;

    // Generate the API key
    const { key, hash, prefix } = generateApiKey();

    // Create the API key in the database
    const apiKey = await prisma.apiKey.create({
      data: {
        userId: req.user.id,
        name: name.trim(),
        keyHash: hash,
        keyPrefix: prefix,
        scopes,
      },
    });

    // Return the response with the raw key (shown only once)
    const response: ApiKeyCreatedResponse = {
      id: apiKey.id,
      name: apiKey.name,
      key, // This is the only time the raw key is returned
      prefix: apiKey.keyPrefix,
      scopes: apiKey.scopes,
      createdAt: apiKey.createdAt,
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Create API key error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
