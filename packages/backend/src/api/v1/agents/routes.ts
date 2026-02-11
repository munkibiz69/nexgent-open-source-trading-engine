/**
 * Agents API routes
 * 
 * Main router that mounts all agent endpoints.
 * 
 * API Key Access:
 * - GET routes: Require 'agents' scope
 * - POST/PUT/DELETE routes: JWT only (web UI)
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { validate } from '@/middleware/validation.js';
import { CreateAgentSchema, UpdateAgentSchema } from '@nexgent/shared';
import { createAgent } from './handlers/create.js';
import { listAgents } from './handlers/list.js';
import { getAgent } from './handlers/get.js';
import { updateAgent } from './handlers/update.js';
import { deleteAgent } from './handlers/delete.js';
import { getAgentTradingConfig, updateAgentTradingConfig } from './handlers/config/index.js';
import { getAgentPositions as getAgentPositionsHandler } from '../agent-positions/handlers/get.js';
import { getAgentPerformance } from './handlers/performance/get.js';
import { getAgentBalanceHistory } from './handlers/balance-history/index.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { Response } from 'express';

const router = Router();

// Write operations - JWT only
router.post('/', authenticate, validate(CreateAgentSchema), createAgent);

// Read operations - JWT or API key with 'agents' scope
router.get('/', authenticateWithScope('agents'), listAgents);

// Nested routes (must come before /:id to avoid route conflicts)
// Wrapper to map :id param to agentId for the positions handler
router.get('/:id/positions', authenticateWithScope('agents'), (req: AuthenticatedRequest, res: Response) => {
  // Map :id param to agentId for compatibility with the positions handler
  req.params.agentId = req.params.id;
  return getAgentPositionsHandler(req, res);
});
router.get('/:id/performance', authenticateWithScope('agents'), (req: AuthenticatedRequest, res: Response) => {
  req.params.agentId = req.params.id;
  return getAgentPerformance(req, res);
});
router.get('/:id/balance-history', authenticateWithScope('agents'), getAgentBalanceHistory);
router.get('/:id/config', authenticateWithScope('agents'), getAgentTradingConfig);

// Agent CRUD endpoints
router.get('/:id', authenticateWithScope('agents'), getAgent);
router.put('/:id', authenticate, validate(UpdateAgentSchema), updateAgent);
router.delete('/:id', authenticate, deleteAgent);

// Trading configuration endpoints - JWT only
router.put('/:id/config', authenticate, updateAgentTradingConfig);
router.patch('/:id/config', authenticate, updateAgentTradingConfig);

// Note: Positions are also available at /api/v1/agent-positions/:agentId

export default router;

