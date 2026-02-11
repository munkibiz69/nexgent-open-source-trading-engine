/**
 * Price Feeds API routes
 * 
 * Main router that mounts all price feed endpoints.
 * All endpoints require authentication.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { getSolUsdPrice } from './handlers/get.js';

const router = Router();

// Get SOL/USD price (requires authentication)
router.get('/sol-usd', authenticate, getSolUsdPrice);

export default router;

