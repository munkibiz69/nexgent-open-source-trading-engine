import { BaseError } from './base.error.js';

export { BaseError };

/**
 * Validation Error
 * 
 * Thrown when request validation fails.
 * Maps to HTTP 400 Bad Request.
 */
export class ValidationError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, true, 'VALIDATION_ERROR', details);
  }
}

/**
 * Authentication Error
 * 
 * Thrown when authentication fails.
 * Maps to HTTP 401 Unauthorized.
 */
export class AuthenticationError extends BaseError {
  constructor(message: string = 'Unauthorized', details?: Record<string, unknown>) {
    super(message, 401, true, 'AUTHENTICATION_ERROR', details);
  }
}

/**
 * Authorization Error
 * 
 * Thrown when authenticated user lacks permission.
 * Maps to HTTP 403 Forbidden.
 */
export class AuthorizationError extends BaseError {
  constructor(message: string = 'Forbidden', details?: Record<string, unknown>) {
    super(message, 403, true, 'AUTHORIZATION_ERROR', details);
  }
}

/**
 * Not Found Error
 * 
 * Thrown when a resource is not found.
 * Maps to HTTP 404 Not Found.
 */
export class NotFoundError extends BaseError {
  constructor(resource: string, details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, true, 'NOT_FOUND', details);
  }
}

/**
 * Conflict Error
 * 
 * Thrown when a resource conflict occurs (e.g. duplicate unique key).
 * Maps to HTTP 409 Conflict.
 */
export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, true, 'CONFLICT', details);
  }
}

/**
 * Trading Error
 * 
 * Thrown when a trading-specific operation fails.
 * Maps to HTTP 400 (usually) or 500 depending on context.
 */
export class TradingError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, true, 'TRADING_ERROR', details);
  }
}

/**
 * External Service Error
 * 
 * Thrown when an external dependency (e.g. Jupiter, DexScreener) fails.
 * Maps to HTTP 502 Bad Gateway.
 */
export class ExternalServiceError extends BaseError {
  constructor(serviceName: string, message: string, details?: Record<string, unknown>) {
    super(`${serviceName} error: ${message}`, 502, true, 'EXTERNAL_SERVICE_ERROR', details);
  }
}
