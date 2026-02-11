/**
 * Readiness probe endpoint
 * 
 * GET /api/v1/health/ready
 * 
 * Returns 200 if the application is ready to accept traffic.
 * Returns 503 if the application is not ready (e.g., during startup).
 */

import { Response } from 'express';
import type { Request } from 'express';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { prisma } from '@/infrastructure/database/client.js';

/**
 * Check if application is ready
 * 
 * Application is ready if:
 * - Database is connected
 * - Redis is connected (optional but preferred)
 */
export async function getReady(req: Request, res: Response): Promise<void> {
  try {
    // Check database (required)
    await prisma.$queryRaw`SELECT 1`;

    // Check Redis (preferred but not required for readiness)
    const redisHealthy = await redisService.healthCheck();

    if (redisHealthy) {
      res.status(200).json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } else {
      // Still ready even if Redis is down (degraded mode)
      res.status(200).json({
        ready: true,
        degraded: true,
        message: 'Redis unavailable, running in degraded mode',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (_error) {
    // Not ready if database is down
    res.status(503).json({
      ready: false,
      message: 'Application not ready',
      timestamp: new Date().toISOString(),
    });
  }
}

