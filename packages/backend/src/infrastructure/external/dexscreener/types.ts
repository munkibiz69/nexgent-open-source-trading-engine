/**
 * Price Feed Service Types
 * 
 * Types for price feed requests and responses
 */

/**
 * Token price information
 */
export interface TokenPrice {
  tokenAddress: string;
  priceSol: number;          // Price in SOL
  priceUsd: number;          // Price in USD
  liquidity: number;         // Liquidity in USD
  priceChange24h: number;    // 24h price change percentage
  lastUpdated: Date;
  pairAddress?: string;      // DEX pair address (optional)
}

/**
 * Price feed provider interface
 * 
 * All price feed providers must implement this interface
 */
export interface PriceFeedProvider {
  /**
   * Get price for a single token
   * 
   * @param tokenAddress - Token address to get price for
   * @returns Token price information
   * @throws PriceFeedServiceError if price fetch fails
   */
  getTokenPrice(tokenAddress: string): Promise<TokenPrice>;

  /**
   * Get prices for multiple tokens
   * 
   * @param tokenAddresses - Array of token addresses
   * @returns Array of token prices (may be fewer than requested if some fail)
   * @throws PriceFeedServiceError if all requests fail
   */
  getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]>;

  /**
   * Get the name of the provider
   */
  getName(): string;
}

/**
 * Price feed service error
 */
export class PriceFeedServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'PriceFeedServiceError';
  }
}

