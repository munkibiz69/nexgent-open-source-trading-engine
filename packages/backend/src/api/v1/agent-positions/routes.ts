/**
 * Agent Positions API routes
 * 
 * Handles agent position endpoints.
 * 
 * API Key Access:
 * - GET routes: Require 'positions' scope
 * - POST routes (close): JWT only (web UI)
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { authenticateWithScope } from '@/middleware/api-key-auth.js';
import { getAgentPositions } from './handlers/get.js';
import { closeAgentPosition } from './handlers/close.js';
import { getTakeProfitSummary } from './handlers/take-profit-summary.js';

const router = Router();

// Read operations - JWT or API key with 'positions' scope
router.get('/:agentId', authenticateWithScope('positions'), getAgentPositions);
router.get('/:agentId/take-profit-summary', authenticateWithScope('positions'), getTakeProfitSummary);

// Write operations - JWT only
router.post('/:agentId/:positionId/close', authenticate, closeAgentPosition);

export default router;

