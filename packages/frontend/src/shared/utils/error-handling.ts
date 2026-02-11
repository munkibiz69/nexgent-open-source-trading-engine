/**
 * Error Handling Utilities
 * 
 * Centralized error handling and formatting functions.
 * 
 * @module shared/utils/error-handling
 */

import type { ApiError } from '@/shared/types/api.types';

/**
 * Error types for classification
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  VALIDATION = 'VALIDATION',
  NOT_FOUND = 'NOT_FOUND',
  SERVER = 'SERVER',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Classified error with type and user-friendly message
 */
export interface ClassifiedError {
  type: ErrorType;
  message: string;
  originalError: unknown;
}

/**
 * Classify error type based on error content
 * 
 * @param error - The error to classify
 * @returns Classified error with type and message
 */
export function classifyError(error: unknown): ClassifiedError {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Network errors
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('connection') ||
      message.includes('timeout') ||
      message.includes('failed to fetch')
    ) {
      return {
        type: ErrorType.NETWORK,
        message: 'Network error. Please check your connection and try again.',
        originalError: error,
      };
    }
    
    // Authentication errors
    if (
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('session expired') ||
      message.includes('invalid token')
    ) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: 'Your session has expired. Please log in again.',
        originalError: error,
      };
    }
    
    // Authorization errors
    if (
      message.includes('forbidden') ||
      message.includes('permission') ||
      message.includes('access denied')
    ) {
      return {
        type: ErrorType.AUTHORIZATION,
        message: 'You do not have permission to perform this action.',
        originalError: error,
      };
    }
    
    // Not found errors
    if (
      message.includes('not found') ||
      message.includes('404') ||
      message.includes('does not exist')
    ) {
      return {
        type: ErrorType.NOT_FOUND,
        message: 'The requested resource was not found.',
        originalError: error,
      };
    }
    
    // Validation errors
    if (
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required') ||
      message.includes('format')
    ) {
      return {
        type: ErrorType.VALIDATION,
        message: error.message || 'Invalid input. Please check your data and try again.',
        originalError: error,
      };
    }
    
    // Server errors
    if (
      message.includes('server') ||
      message.includes('500') ||
      message.includes('internal error')
    ) {
      return {
        type: ErrorType.SERVER,
        message: 'Server error. Please try again later.',
        originalError: error,
      };
    }
    
    // Default: return the error message
    return {
      type: ErrorType.UNKNOWN,
      message: error.message || 'An unexpected error occurred.',
      originalError: error,
    };
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      type: ErrorType.UNKNOWN,
      message: error,
      originalError: error,
    };
  }
  
  // Handle API error objects
  if (error && typeof error === 'object' && 'error' in error) {
    const apiError = error as ApiError;
    return {
      type: ErrorType.UNKNOWN,
      message: apiError.message || apiError.error || 'An error occurred.',
      originalError: error,
    };
  }
  
  // Unknown error
  return {
    type: ErrorType.UNKNOWN,
    message: 'An unexpected error occurred.',
    originalError: error,
  };
}

/**
 * Format error message for display to users
 * 
 * @param error - The error to format
 * @returns User-friendly error message
 * 
 * @example
 * ```ts
 * const message = formatErrorMessage(error);
 * toast({ title: 'Error', description: message });
 * ```
 */
export function formatErrorMessage(error: unknown): string {
  const classified = classifyError(error);
  return classified.message;
}

/**
 * Handle API error and return user-friendly message
 * 
 * This is a convenience function that combines error classification
 * and formatting for API errors.
 * 
 * @param error - The error to handle
 * @returns User-friendly error message
 * 
 * @example
 * ```ts
 * try {
 *   await apiCall();
 * } catch (error) {
 *   const message = handleApiError(error);
 *   toast({ title: 'Error', description: message });
 * }
 * ```
 */
export function handleApiError(error: unknown): string {
  return formatErrorMessage(error);
}

