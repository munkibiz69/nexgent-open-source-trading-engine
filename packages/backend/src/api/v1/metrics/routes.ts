/**
 * Metrics API routes
 * 
 * Provides Prometheus metrics endpoint.
 */

import { Router } from 'express';
import { getMetricsHandler } from './handlers/get.js';

const router = Router();

// Metrics endpoint (no authentication required for Prometheus scraping)
router.get('/', getMetricsHandler);

export default router;

