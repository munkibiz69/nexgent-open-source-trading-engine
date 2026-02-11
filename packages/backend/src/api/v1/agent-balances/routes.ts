/**
 * Agent Balances API routes
 * 
 * Main router that mounts all agent balance endpoints.
 * 
 * API Key Access:
 * - GET routes: Require 'balances' scope
 * - POST/PUT/DELETE routes: JWT only (web UI)
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { createAgentBalance } from './handlers/create.js';
import { listAgentBalances } from './handlers/list.js';
import { getAgentBalance } from './handlers/get.js';
import { updateAgentBalance } from './handlers/update.js';
import { deleteAgentBalance } from './handlers/delete.js';

const router = Router();

// Write operations - JWT only
router.post('/', authenticate, createAgentBalance);

// Read operations - JWT or API key with 'balances' scope
router.get('/', authenticateWithScope('balances'), listAgentBalances);
router.get('/:id', authenticateWithScope('balances'), getAgentBalance);

// Write operations - JWT only
router.put('/:id', authenticate, updateAgentBalance);
router.delete('/:id', authenticate, deleteAgentBalance);

export default router;

