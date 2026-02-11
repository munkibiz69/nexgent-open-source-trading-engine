/**
 * Data Sources API routes
 * 
 * Main router that mounts all data source endpoints.
 * All endpoints require authentication and rate limiting.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { rateLimiter } from '@/middleware/rate-limiter.js';
import { getDataSourceStatus } from './handlers/get.js';

const router = Router();

// Rate limiter for data source endpoints (read-only, so more lenient)
const dataSourceRateLimiter = rateLimiter(30, 60 * 1000, 'Too many requests. Please try again later.');

// Get data source status (requires authentication and rate limiting)
router.get('/status', authenticate, dataSourceRateLimiter, getDataSourceStatus);

export default router;

