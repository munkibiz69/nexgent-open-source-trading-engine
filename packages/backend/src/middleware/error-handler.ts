/**
 * Error handling utilities
 * 
 * Provides standardized error handling middleware using the shared error classes.
 */

import { Request, Response, NextFunction } from 'express';
import { BaseError, NotFoundError } from '@/shared/errors/index.js';
import { appConfig } from '@/config/app.config.js';

/**
 * Error handler middleware
 * 
 * Handles all errors in the application, ensuring a consistent response format.
 */
export function errorHandler(
  err: Error | BaseError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // If response already sent, delegate to default Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Log error for debugging
  if (appConfig.logLevel === 'debug' || !(err instanceof BaseError) || err.statusCode >= 500) {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  }

  // Determine status code and response body
  let statusCode = 500;
  let responseBody: Record<string, unknown> = {
    success: false,
    error: 'Internal Server Error',
  };

  if (err instanceof BaseError) {
    statusCode = err.statusCode;
    responseBody = {
      success: false,
      error: err.message,
      code: err.code,
      details: err.details,
    };
  } else if (err instanceof Error) {
    // Handle generic errors
    responseBody.error = appConfig.env === 'production' 
      ? 'An unexpected error occurred' 
      : err.message;
  }

  // Add stack trace in development
  if (appConfig.env === 'development') {
    responseBody.stack = err.stack;
  }

  res.status(statusCode).json(responseBody);
}

/**
 * Async error wrapper
 * 
 * Wraps async route handlers to catch errors and pass them to error handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void | unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 404 Not Found handler
 * 
 * Handles requests to undefined routes
 */
export function notFoundHandler(req: Request, res: Response, next: NextFunction) {
  next(new NotFoundError(`Route not found: ${req.method} ${req.path}`));
}
