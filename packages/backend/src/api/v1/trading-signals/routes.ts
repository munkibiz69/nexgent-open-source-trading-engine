/**
 * Trading Signals API routes
 * 
 * Main router that mounts all trading signal endpoints.
 * 
 * API Key Access:
 * - All routes require 'signals' scope (read + write)
 * - POST is rate limited: 120 requests per minute
 */

import { Router } from 'express';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { signalsApiKeyRateLimiter } from '@/middleware/rate-limiter.js';
import { createTradingSignal } from './handlers/create.js';
import { listTradingSignals } from './handlers/list.js';
import { exportTradingSignals } from './handlers/export.js';
import { getTradingSignal } from './handlers/get.js';
import { updateTradingSignal } from './handlers/update.js';
import { deleteTradingSignal } from './handlers/delete.js';

const router = Router();

// All trading signal endpoints require 'signals' scope (JWT or API key)
// POST is rate limited for API keys
router.post('/', authenticateWithScope('signals'), signalsApiKeyRateLimiter, createTradingSignal);
router.get('/', authenticateWithScope('signals'), listTradingSignals);
router.get('/export', authenticateWithScope('signals'), exportTradingSignals);
router.get('/:id', authenticateWithScope('signals'), getTradingSignal);
router.put('/:id', authenticateWithScope('signals'), updateTradingSignal);
router.delete('/:id', authenticateWithScope('signals'), deleteTradingSignal);

export default router;

