/**
 * API Keys routes
 * 
 * Main router that mounts all API key endpoints.
 * All endpoints require JWT authentication (for managing keys).
 */

import { Router } from 'express';
import { authenticate } from '@/middleware/auth.js';
import { validate } from '@/middleware/validation.js';
import { CreateApiKeySchema } from '@nexgent/shared';
import { createApiKey } from './handlers/create.js';
import { listApiKeys } from './handlers/list.js';
import { getApiKey } from './handlers/get.js';
import { deleteApiKey } from './handlers/delete.js';

const router = Router();

// All API key management endpoints require JWT authentication
router.post('/', authenticate, validate(CreateApiKeySchema), createApiKey);
router.get('/', authenticate, listApiKeys);
router.get('/:id', authenticate, getApiKey);
router.delete('/:id', authenticate, deleteApiKey);

export default router;
