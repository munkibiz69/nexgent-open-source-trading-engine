/**
 * Wallets API routes
 * 
 * Main router that mounts all wallet endpoints.
 * All endpoints require authentication.
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { walletRateLimiter } from '@/middleware/rate-limiter.js';
import { validate } from '@/middleware/validation.js';
import { AssignWalletSchema } from '@nexgent/shared';
import { listWallets } from './handlers/list.js';
import { assignWallet } from './handlers/assign.js';
import { resetWallet } from './handlers/reset.js';
import { unassignWallet } from './handlers/unassign.js';
import { checkDeposits } from './handlers/check-deposits.js';

const router = Router();

// All wallet endpoints require authentication
router.get('/agent/:agentId', authenticate, listWallets);
router.post('/assign', authenticate, walletRateLimiter, validate(AssignWalletSchema), assignWallet);
router.post('/:walletAddress/reset', authenticate, walletRateLimiter, resetWallet);
router.post('/:walletAddress/unassign', authenticate, walletRateLimiter, unassignWallet);
router.post('/:walletAddress/check-deposits', authenticate, walletRateLimiter, checkDeposits);

export default router;

