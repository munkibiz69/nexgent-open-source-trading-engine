/**
 * Price Feed Service
 * 
 * Service for fetching token prices using configurable price feed providers.
 * Supports multiple providers (DexScreener, Jupiter, etc.) with extensible architecture.
 */

import type { PriceFeedProvider, TokenPrice } from './types.js';
import { PriceFeedServiceError } from './types.js';
import { DexScreenerPriceProvider } from './dexscreener-price-provider.js';
import { JupiterPriceProvider } from '../jupiter/price/jupiter-price-provider.js';

/**
 * Get default price provider based on environment configuration
 * 
 * @returns Default price provider instance
 */
function getDefaultProvider(): PriceFeedProvider {
  const providerName = process.env.PRICE_PROVIDER?.toLowerCase() || 'jupiter';

  switch (providerName) {
    case 'jupiter':
      return new JupiterPriceProvider();
    case 'dexscreener':
      return new DexScreenerPriceProvider();
    default:
      console.warn(`[PriceFeedService] Unknown provider "${providerName}", defaulting to Jupiter`);
      return new JupiterPriceProvider();
  }
}

/**
 * Price Feed Service
 * 
 * Manages price fetching using configurable providers.
 * Default provider: Jupiter (configurable via PRICE_PROVIDER env var)
 */
class PriceFeedService {
  private provider: PriceFeedProvider;

  constructor(provider?: PriceFeedProvider) {
    // Use provided provider or get default from environment
    this.provider = provider || getDefaultProvider();
    console.log(`[PriceFeedService] Initialized with provider: ${this.provider.getName()}`);
  }

  /**
   * Set the price feed provider
   * 
   * @param provider - Price feed provider instance
   */
  setProvider(provider: PriceFeedProvider): void {
    this.provider = provider;
  }

  /**
   * Get the current price feed provider
   * 
   * @returns Current price feed provider
   */
  getProvider(): PriceFeedProvider {
    return this.provider;
  }

  /**
   * Get price for a single token
   * 
   * @param tokenAddress - Token address to get price for
   * @returns Token price information
   * @throws PriceFeedServiceError if price fetch fails
   */
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    try {
      return await this.provider.getTokenPrice(tokenAddress);
    } catch (error) {
      if (error instanceof PriceFeedServiceError) {
        throw error;
      }

      throw new PriceFeedServiceError(
        `Failed to get token price: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_FAILED',
        {
          provider: this.provider.getName(),
          tokenAddress,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  /**
   * Get prices for multiple tokens
   * 
   * @param tokenAddresses - Array of token addresses
   * @returns Array of token prices (may be fewer than requested if some fail)
   * @throws PriceFeedServiceError if all requests fail
   */
  async getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    try {
      return await this.provider.getMultipleTokenPrices(tokenAddresses);
    } catch (error) {
      if (error instanceof PriceFeedServiceError) {
        throw error;
      }

      throw new PriceFeedServiceError(
        `Failed to get token prices: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'FETCH_FAILED',
        {
          provider: this.provider.getName(),
          tokenAddresses,
          originalError: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}

// Export singleton instance
export const priceFeedService = new PriceFeedService();

// Export class for testing or custom instances
export { PriceFeedService };

// Re-export types
export * from './types.js';

