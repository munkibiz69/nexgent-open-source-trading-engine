/**
 * Agent Transactions API routes
 * 
 * Main router that mounts all agent transaction endpoints.
 * 
 * API Key Access:
 * - GET routes: Require 'transactions' scope
 * - POST/PUT/DELETE routes: JWT only (web UI)
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { createAgentTransaction } from './handlers/create.js';
import { listAgentTransactions } from './handlers/list.js';
import { getAgentTransaction } from './handlers/get.js';
import { updateAgentTransaction } from './handlers/update.js';
import { deleteAgentTransaction } from './handlers/delete.js';

const router = Router();

// Write operations - JWT only
router.post('/', authenticate, createAgentTransaction);

// Read operations - JWT or API key with 'transactions' scope
router.get('/', authenticateWithScope('transactions'), listAgentTransactions);
router.get('/:id', authenticateWithScope('transactions'), getAgentTransaction);

// Write operations - JWT only
router.put('/:id', authenticate, updateAgentTransaction);
router.delete('/:id', authenticate, deleteAgentTransaction);

export default router;

