/**
 * Trades API Routes
 * 
 * Routes for executing trades using the Trading Executor.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { executeTrade } from './handlers/execute.js';

const router = Router();

// All trade endpoints require authentication
router.post('/execute', authenticate, executeTrade);

export { router as tradeRoutes };

