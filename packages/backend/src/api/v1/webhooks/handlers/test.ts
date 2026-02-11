/**
 * Test webhook handler
 * 
 * Accepts arbitrary webhook payloads for testing purposes.
 * Only available in development mode.
 */

import type { Request, Response } from 'express';

/**
 * Test webhook endpoint handler
 * 
 * POST /api/webhooks/test
 * 
 * Accepts any JSON payload and logs it for inspection.
 * Returns the received payload for verification.
 */
export async function handleTestWebhook(
  req: Request,
  res: Response
): Promise<void> {
  // Only allow in development mode
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({
      error: 'Not found',
    });
    return;
  }

  const timestamp = new Date().toISOString();

  // Log the webhook request to console (development only)
  if (process.env.NODE_ENV === 'development') {
    console.log('\n📥 Test Webhook Received');
    console.log('─'.repeat(50));
    console.log(`Time: ${timestamp}`);
    console.log(`Method: ${req.method}`);
    console.log(`Path: ${req.path}`);
    console.log(`Headers:`, JSON.stringify(req.headers, null, 2));
    console.log(`Body:`, JSON.stringify(req.body, null, 2));
    console.log(`Query:`, JSON.stringify(req.query, null, 2));
    console.log('─'.repeat(50));
  }

  // Return the received payload
  res.status(200).json({
    success: true,
    message: 'Webhook received successfully',
    timestamp,
    received: {
      headers: req.headers,
      body: req.body,
      query: req.query,
      method: req.method,
      path: req.path,
    },
  });
}


