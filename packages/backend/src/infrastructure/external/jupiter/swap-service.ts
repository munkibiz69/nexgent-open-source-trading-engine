/**
 * Swap Service
 * 
 * Service for executing token swaps using configurable swap providers.
 * Supports multiple providers (Jupiter, Raydium, etc.) with extensible architecture.
 */

import type { SwapProvider, SwapQuoteRequest, SwapQuote, SwapExecuteRequest, SwapResult } from './types.js';
import { SwapServiceError } from './types.js';
import { JupiterSwapProvider } from './jupiter-swap-provider.js';

/**
 * Swap Service
 * 
 * Manages swap execution using configurable providers.
 * Default provider: Jupiter
 */
class SwapService {
  private provider: SwapProvider;

  constructor(provider?: SwapProvider) {
    // Default to Jupiter provider
    this.provider = provider || new JupiterSwapProvider();
  }

  /**
   * Set the swap provider
   * 
   * @param provider - Swap provider instance
   */
  setProvider(provider: SwapProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current swap provider
   * 
   * @returns Current swap provider
   */
  getProvider(): SwapProvider {
    return this.provider;
  }

  /**
   * Get a quote for a swap
   * 
   * @param request - Swap quote request
   * @returns Swap quote with expected output and transaction data
   * @throws SwapServiceError if quote fails
   */
  async getQuote(request: SwapQuoteRequest): Promise<SwapQuote> {
    try {
      return await this.provider.getQuote(request);
    } catch (error) {
      if (error instanceof SwapServiceError) {
        throw error;
      }

      throw new SwapServiceError(
        `Failed to get swap quote: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'QUOTE_FAILED',
        {
          provider: this.provider.getName(),
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Execute a swap based on a quote
   * 
   * @param request - Swap execution request
   * @returns Swap result with actual amounts and transaction hash
   * @throws SwapServiceError if execution fails
   */
  async executeSwap(request: SwapExecuteRequest): Promise<SwapResult> {
    try {
      return await this.provider.executeSwap(request);
    } catch (error) {
      if (error instanceof SwapServiceError) {
        throw error;
      }

      throw new SwapServiceError(
        `Failed to execute swap: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'EXECUTION_FAILED',
        {
          provider: this.provider.getName(),
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

// Export singleton instance
export const swapService = new SwapService();

// Export class for testing or custom instances
export { SwapService };

// Re-export types and constants
export * from './types.js';
export { SOL_MINT_ADDRESS } from './jupiter-swap-provider.js';

