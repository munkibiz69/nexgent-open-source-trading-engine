/**
 * Request logging middleware
 * 
 * Adds request ID and logs all HTTP requests using structured logging.
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '@/infrastructure/logging/logger.js';
import { apiRequestCount, apiRequestLatency } from '@/infrastructure/metrics/metrics.js';

/**
 * Add request ID to request and log the request
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  // Generate or use existing request ID
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  
  // Add request ID to request object
  (req as Request & { requestId: string }).requestId = requestId;
  
  // Add request ID to response headers
  res.setHeader('x-request-id', requestId);
  
  // Create request-scoped logger
  const logger = createRequestLogger(requestId, {
    method: req.method,
    path: req.path,
    ip: req.ip || req.socket.remoteAddress,
  });
  
  // Store logger in request for use in handlers
  (req as Request & { logger: typeof logger }).logger = logger;
  
  // Log request start
  logger.info({ 
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip || req.socket.remoteAddress,
  }, 'Incoming request');
  
  // Log response when finished and record metrics
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const durationSeconds = duration / 1000;
    
    // Normalize path for metrics (remove IDs, etc.)
    const normalizedPath = req.path.replace(/\/[a-f0-9-]{36}/g, '/:id').replace(/\/\d+/g, '/:id');
    
    // Record metrics
    apiRequestLatency.observe({ method: req.method, path: normalizedPath }, durationSeconds);
    apiRequestCount.inc({ method: req.method, path: normalizedPath, status: res.statusCode.toString() });
    
    logger.info({
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
    }, 'Request completed');
  });
  
  next();
}

