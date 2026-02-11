/**
 * Base Price Feed Provider
 * 
 * Abstract base class for price feed providers
 */

import type { PriceFeedProvider, TokenPrice } from './types.js';

/**
 * Abstract base class for price feed providers
 * 
 * Provides common functionality and ensures all providers implement required methods
 */
export abstract class BasePriceProvider implements PriceFeedProvider {
  /**
   * Get price for a single token
   * 
   * Must be implemented by subclasses
   */
  abstract getTokenPrice(tokenAddress: string): Promise<TokenPrice>;

  /**
   * Get prices for multiple tokens
   * 
   * Must be implemented by subclasses
   */
  abstract getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]>;

  /**
   * Get the name of the provider
   * 
   * Must be implemented by subclasses
   */
  abstract getName(): string;

  /**
   * Validate token address
   * 
   * Common validation logic for all providers
   */
  protected validateTokenAddress(tokenAddress: string): void {
    if (!tokenAddress || typeof tokenAddress !== 'string') {
      throw new Error('Invalid tokenAddress: must be a non-empty string');
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

