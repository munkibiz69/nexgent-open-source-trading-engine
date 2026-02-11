/**
 * Webhook routes
 * 
 * Handles incoming webhooks from external services.
 */

import { Router } from 'express';
import { handleTestWebhook } from './handlers/test.js';

const router = Router();

/**
 * Webhook logging middleware
 * Logs all webhook requests to console (development only)
 */
router.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Console logging (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log(`\n🔔 [${timestamp}] Webhook Request: ${req.method} ${req.path}`);
    console.log(`   IP: ${ip}`);
    console.log(`   User-Agent: ${userAgent}`);
  }

  next();
});

/**
 * Test webhook endpoint (development only)
 * POST /api/webhooks/test
 * 
 * Accepts any JSON payload for testing webhook delivery.
 * Skips signature verification in development mode.
 */
router.post('/test', handleTestWebhook);

export default router;


