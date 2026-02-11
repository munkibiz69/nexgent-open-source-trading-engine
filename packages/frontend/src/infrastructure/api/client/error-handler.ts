/**
 * API Error Handler
 * 
 * Centralized error processing and user-friendly error messages.
 * 
 * @deprecated This file is maintained for backward compatibility.
 * New code should use error handling utilities from '@/shared/utils/error-handling'.
 * 
 * @module infrastructure/api/client
 */

import { handleApiError as sharedHandleApiError } from '@/shared/utils/error-handling';

/**
 * API error response structure
 */
export interface ApiErrorResponse {
  error?: string;
  message?: string;
  status?: number;
  statusText?: string;
}

/**
 * Handle API errors and extract user-friendly error messages
 * 
 * @deprecated Use handleApiError from '@/shared/utils/error-handling' instead.
 * 
 * @param error - Error from API response or thrown error
 * @param defaultMessage - Default error message if none found
 * @returns User-friendly error message
 */
export function handleApiError(
  error: unknown,
  defaultMessage = 'An error occurred'
): string {
  // Use shared error handling utility
  const message = sharedHandleApiError(error);
  return message || defaultMessage;
}

/**
 * Extract error from API response
 * 
 * @param response - Fetch Response object
 * @returns Promise resolving to error message
 */
export async function extractErrorFromResponse(
  response: Response
): Promise<string> {
  try {
    const error = await response.json();
    return handleApiError(error, response.statusText || 'Request failed');
  } catch {
    // If JSON parsing fails, return status text
    return response.statusText || 'Request failed';
  }
}
