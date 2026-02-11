/**
 * Agent Historical Swaps API routes
 * 
 * Main router that mounts all agent historical swap endpoints.
 * 
 * API Key Access:
 * - GET routes: Require 'history' scope
 * - POST/PUT/DELETE routes: JWT only (web UI)
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { createAgentHistoricalSwap } from './handlers/create.js';
import { listAgentHistoricalSwaps } from './handlers/list.js';
import { exportAgentHistoricalSwaps } from './handlers/export.js';
import { getAgentHistoricalSwap } from './handlers/get.js';
import { updateAgentHistoricalSwap } from './handlers/update.js';
import { deleteAgentHistoricalSwap } from './handlers/delete.js';

const router = Router();

// Write operations - JWT only
router.post('/', authenticate, createAgentHistoricalSwap);

// Read operations - JWT or API key with 'history' scope
router.get('/', authenticateWithScope('history'), listAgentHistoricalSwaps);
router.get('/export', authenticateWithScope('history'), exportAgentHistoricalSwaps);
router.get('/:id', authenticateWithScope('history'), getAgentHistoricalSwap);

// Write operations - JWT only
router.put('/:id', authenticate, updateAgentHistoricalSwap);
router.delete('/:id', authenticate, deleteAgentHistoricalSwap);

export default router;

