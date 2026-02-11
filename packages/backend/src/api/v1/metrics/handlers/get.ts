/**
 * Metrics endpoint
 * 
 * GET /api/v1/metrics
 * 
 * Returns Prometheus metrics in text format.
 */

import { Response } from 'express';
import type { Request } from 'express';
import { getMetrics } from '@/infrastructure/metrics/metrics.js';

/**
 * Get Prometheus metrics
 */
export async function getMetricsHandler(req: Request, res: Response): Promise<void> {
  try {
    const metrics = await getMetrics();
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    res.send(metrics);
  } catch (error) {
    console.error('Failed to get metrics:', error);
    res.status(500).json({
      error: 'Failed to get metrics',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

