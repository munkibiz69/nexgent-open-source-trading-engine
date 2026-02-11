/**
 * Health check API routes
 * 
 * Provides health, readiness, and liveness endpoints for monitoring.
 */

import { Router } from 'express';
import { getHealth } from './handlers/health.js';
import { getReady } from './handlers/ready.js';
import { getLive } from './handlers/live.js';

const router = Router();

// Health check endpoints (no authentication required)
router.get('/', getHealth);
router.get('/ready', getReady);
router.get('/live', getLive);

export default router;

