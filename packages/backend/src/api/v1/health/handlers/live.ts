/**
 * Liveness probe endpoint
 * 
 * GET /api/v1/health/live
 * 
 * Returns 200 if the application is alive (process is running).
 * This is a simple check that doesn't verify dependencies.
 */

import { Response } from 'express';
import type { Request } from 'express';

/**
 * Check if application is alive
 */
export function getLive(req: Request, res: Response): void {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
  });
}

