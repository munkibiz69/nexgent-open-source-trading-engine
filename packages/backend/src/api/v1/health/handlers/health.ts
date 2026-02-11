/**
 * Health check endpoint
 * 
 * GET /api/v1/health
 * 
 * Returns the health status of the application and its dependencies.
 */

import { Response } from 'express';
import type { Request } from 'express';
import { redisService } from '@/infrastructure/cache/redis-client.js';
import { prisma } from '@/infrastructure/database/client.js';
import { queueClient } from '@/infrastructure/queue/queue-client.js';
import { QueueName } from '@/infrastructure/queue/job-types.js';

/**
 * Health check response
 */
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  services: {
    database: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
    redis: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
    };
    queue: {
      status: 'healthy' | 'unhealthy';
      latency?: number;
      workerCount?: number;
    };
  };
}

/**
 * Get health status
 */
export async function getHealth(req: Request, res: Response): Promise<void> {
  const uptime = process.uptime();

  // Check all services in parallel
  const [dbHealth, redisHealth, queueHealth] = await Promise.allSettled([
    checkDatabase(),
    checkRedis(),
    checkQueue(),
  ]);

  // Determine overall status
  const services = {
    database: dbHealth.status === 'fulfilled' ? dbHealth.value : { status: 'unhealthy' as const },
    redis: redisHealth.status === 'fulfilled' ? redisHealth.value : { status: 'unhealthy' as const },
    queue: queueHealth.status === 'fulfilled' ? queueHealth.value : { status: 'unhealthy' as const },
  };

  // Overall status: healthy if all critical services are healthy
  // Degraded if Redis or Queue is down (non-critical for basic operation)
  // Unhealthy if database is down (critical)
  let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  if (services.database.status === 'unhealthy') {
    overallStatus = 'unhealthy';
  } else if (services.redis.status === 'unhealthy' || services.queue.status === 'unhealthy') {
    overallStatus = 'degraded';
  } else {
    overallStatus = 'healthy';
  }

  const healthStatus: HealthStatus = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    services,
  };

  // Return appropriate status code
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  res.status(statusCode).json(healthStatus);
}

/**
 * Check database health
 */
async function checkDatabase(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
  const startTime = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    const latency = Date.now() - startTime;
    return { status: 'healthy', latency };
  } catch (_error) {
    return { status: 'unhealthy' };
  }
}

/**
 * Check Redis health
 */
async function checkRedis(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number }> {
  const startTime = Date.now();
  try {
    const isHealthy = await redisService.healthCheck();
    const latency = Date.now() - startTime;
    return { status: isHealthy ? 'healthy' : 'unhealthy', latency };
  } catch (_error) {
    return { status: 'unhealthy' };
  }
}

/**
 * Check queue health
 */
async function checkQueue(): Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; workerCount?: number }> {
  const startTime = Date.now();
  try {
    // Check if queue client is initialized
    // Note: BullMQ doesn't expose worker count easily, so we just check if it's connected
    const queue = queueClient.getQueue(QueueName.DATABASE_WRITES);
    if (!queue) {
      return { status: 'unhealthy' };
    }
    // Get queue stats to verify it's actually working (this also measures latency)
    await queue.getWaitingCount();
    const latency = Date.now() - startTime;
    // Queue is healthy if we can get it and query it
    return { status: 'healthy', latency };
  } catch (_error) {
    return { status: 'unhealthy' };
  }
}

