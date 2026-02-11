/**
 * Get data source status endpoint
 * 
 * GET /api/data-sources/status
 * 
 * Returns the configuration status of all data sources.
 * Requires authentication.
 */

import { Response } from 'express';
import type { AuthenticatedRequest } from '@/middleware/auth.js';

/**
 * Data source status response
 * 
 * Note: Only returns configuration status (configured: boolean) for security.
 * Does not expose actual URLs, API keys, or other sensitive configuration values.
 */
export interface DataSourceStatusResponse {
  pythNetwork: {
    configured: boolean;
  };
  pythSolPriceFeed: {
    configured: boolean;
  };
  jupiter: {
    configured: boolean;
  };
  dexscreener: {
    configured: boolean;
  };
  liquidityChecks: {
    configured: boolean;
  };
  signalGeneration: {
    configured: boolean;
  };
}

/**
 * Get data source configuration status
 * 
 * Returns configuration status for all data sources without exposing sensitive values.
 * Only returns boolean flags indicating if each data source is configured.
 * 
 * Returns: { 
 *   pythNetwork: { configured: boolean },
 *   pythSolPriceFeed: { configured: boolean },
 *   jupiter: { configured: boolean },
 *   dexscreener: { configured: boolean },
 * }
 */
export async function getDataSourceStatus(
  req: AuthenticatedRequest,
  res: Response
) {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Check environment variables (without exposing their values)
    // Note: Pyth and DexScreener URLs are hardcoded, so always configured
    const jupiterApiKey = process.env.JUPITER_API_KEY;

    const response: DataSourceStatusResponse = {
      pythNetwork: {
        configured: true, // Hardcoded URL
      },
      pythSolPriceFeed: {
        configured: true, // Hardcoded feed ID
      },
      jupiter: {
        configured: !!jupiterApiKey,
      },
      dexscreener: {
        configured: true, // Hardcoded URL
      },
      liquidityChecks: {
        configured: true, // Uses hardcoded DexScreener URL
      },
      signalGeneration: {
        configured: true,
      },
    };

    res.json(response);
  } catch (error) {
    console.error('Get data source status error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}

