/**
 * Delete API key endpoint
 * 
 * DELETE /api/v1/api-keys/:id
 * 
 * Deletes an API key (only if it belongs to the authenticated user).
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Delete an API key
 * 
 * Params: { id: string }
 * Returns: { success: true, message: string }
 */
export async function deleteApiKey(req: AuthenticatedRequest, res: Response) {
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

    // Check if API key exists and belongs to the authenticated user
    const existingKey = await prisma.apiKey.findFirst({
      where: {
        id,
        userId: req.user.id, // Ensure user can only delete their own keys
      },
    });

    if (!existingKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    // Delete the API key
    await prisma.apiKey.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
