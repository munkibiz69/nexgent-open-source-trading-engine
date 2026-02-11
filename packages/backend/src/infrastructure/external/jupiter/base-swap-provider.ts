/**
 * Base Swap Provider
 * 
 * Abstract base class for swap providers
 */

import type { SwapProvider, SwapQuoteRequest, SwapQuote, SwapExecuteRequest, SwapResult } from './types.js';

/**
 * Abstract base class for swap providers
 * 
 * Provides common functionality and ensures all providers implement required methods
 */
export abstract class BaseSwapProvider implements SwapProvider {
  /**
   * Get a quote for a swap
   * 
   * Must be implemented by subclasses
   */
  abstract getQuote(request: SwapQuoteRequest): Promise<SwapQuote>;

  /**
   * Execute a swap based on a quote
   * 
   * Must be implemented by subclasses
   */
  abstract executeSwap(request: SwapExecuteRequest): Promise<SwapResult>;

  /**
   * Get the name of the provider
   * 
   * Must be implemented by subclasses
   */
  abstract getName(): string;

  /**
   * Validate swap quote request
   * 
   * Common validation logic for all providers
   */
  protected validateQuoteRequest(request: SwapQuoteRequest): void {
    if (!request.inputMint || typeof request.inputMint !== 'string') {
      throw new Error('Invalid inputMint: must be a non-empty string');
    }

    if (!request.outputMint || typeof request.outputMint !== 'string') {
      throw new Error('Invalid outputMint: must be a non-empty string');
    }

    if (typeof request.amount !== 'number' || request.amount <= 0) {
      throw new Error('Invalid amount: must be a positive number');
    }

    if (request.inputMint === request.outputMint) {
      throw new Error('Input and output mints cannot be the same');
    }
  }

  /**
   * Execute a function with retry logic
   * 
   * @param fn - Function to execute
   * @param maxRetries - Maximum number of retries
   * @param baseDelay - Base delay in milliseconds for exponential backoff
   * @returns Result of the function
   * @throws Error if max retries exceeded or non-retryable error occurs
   */
  protected async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | unknown;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (
          error &&
          typeof error === 'object' &&
          'status' in error &&
          typeof (error as { status: number }).status === 'number'
        ) {
          const status = (error as { status: number }).status;
          if (status >= 400 && status < 500) {
            throw error; // Client errors are not retryable
          }
        }

        // If this is the last attempt, throw the error
        if (attempt === maxRetries - 1) {
          throw error;
        }

        // Exponential backoff
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }
}

