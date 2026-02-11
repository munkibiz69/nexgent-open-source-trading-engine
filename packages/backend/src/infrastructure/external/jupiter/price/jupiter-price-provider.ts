/**
 * Jupiter Price Provider
 * 
 * Implementation of price feed provider using Jupiter Price API V3
 * https://dev.jup.ag/docs/price/v3
 */

import { BasePriceProvider } from '../../dexscreener/base-price-provider.js';
import type { TokenPrice } from '../../dexscreener/types.js';
import { PriceFeedServiceError } from '../../dexscreener/types.js';
import { PriceService } from '../../pyth/index.js';

/**
 * Jupiter API base URL
 */
const JUPITER_API_BASE_URL = process.env.JUPITER_API_URL || 'https://lite-api.jup.ag/price/v3';

/**
 * Maximum tokens per batch request
 */
const MAX_BATCH_SIZE = 50;

/**
 * Jupiter Price API V3 response structure
 */
interface JupiterPriceResponse {
  [tokenAddress: string]: {
    usdPrice: number;
    blockId: number;
    decimals: number;
    priceChange24h: number;
  };
}

/**
 * Jupiter Price Provider
 * 
 * Implements price feed functionality using Jupiter Price API V3
 * Note: Jupiter only provides USD prices, so we convert to SOL using Pyth Network SOL/USD price
 */
export class JupiterPriceProvider extends BasePriceProvider {
  private readonly baseUrl: string;
  private readonly apiKey?: string;

  constructor(baseUrl?: string, apiKey?: string) {
    super();
    this.baseUrl = baseUrl || JUPITER_API_BASE_URL;
    this.apiKey = apiKey || process.env.JUPITER_API_KEY;
  }

  /**
   * Get the name of the provider
   */
  getName(): string {
    return 'jupiter';
  }

  /**
   * Get SOL/USD price from Pyth Network
   * 
   * @returns SOL price in USD
   */
  private getSolUsdPrice(): number {
    const priceService = PriceService.getInstance();
    return priceService.getSolPrice();
  }

  /**
   * Parse Jupiter response to TokenPrice
   * 
   * @param response - Jupiter API response
   * @param tokenAddress - Token address being queried (original case)
   * @param solUsdPrice - SOL/USD price for conversion
   * @returns TokenPrice or null if token not found
   */
  private parseTokenPrice(
    response: JupiterPriceResponse,
    tokenAddress: string,
    solUsdPrice: number
  ): TokenPrice | null {
    const normalizedAddress = tokenAddress.toLowerCase();
    const responseKeys = Object.keys(response);
    
    if (responseKeys.length === 0) {
      return null;
    }

    // Jupiter returns keys in original case, so we need to do case-insensitive lookup
    // First try exact match (most common case)
    let tokenData = response[tokenAddress];
    
    // If not found, try case-insensitive lookup
    if (!tokenData) {
      const matchingKey = responseKeys.find(
        key => key.toLowerCase() === normalizedAddress
      );
      if (matchingKey) {
        tokenData = response[matchingKey];
      } else {
        return null;
      }
    }

    if (!tokenData || !tokenData.usdPrice || tokenData.usdPrice <= 0) {
      return null;
    }

    // Convert USD price to SOL price
    const priceSol = tokenData.usdPrice / solUsdPrice;

    return {
      tokenAddress: normalizedAddress, // Normalize for storage
      priceSol,
      priceUsd: tokenData.usdPrice,
      liquidity: 0, // Jupiter doesn't provide liquidity data
      priceChange24h: tokenData.priceChange24h || 0,
      lastUpdated: new Date(),
      // pairAddress is not provided by Jupiter
    };
  }

  /**
   * Get price for a single token
   * 
   * @param tokenAddress - Token address to get price for
   * @returns Token price information
   * @throws PriceFeedServiceError if price fetch fails
   */
  async getTokenPrice(tokenAddress: string): Promise<TokenPrice> {
    this.validateTokenAddress(tokenAddress);

    const url = `${this.baseUrl}?ids=${encodeURIComponent(tokenAddress)}`;

    try {
      const response = await this.executeWithRetry(async () => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };

        // Add API key if available (for Pro tier)
        if (this.apiKey) {
          headers['Authorization'] = `Bearer ${this.apiKey}`;
        }

        const res = await fetch(url, {
          method: 'GET',
          headers,
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error');
          console.error(`[Jupiter] API error for ${tokenAddress}: ${res.status} ${res.statusText} - ${errorText}`);
          const error = new Error(`Jupiter API error: ${res.status} ${res.statusText} - ${errorText}`) as Error & { status: number };
          error.status = res.status;
          throw error;
        }

        return res;
      });

      // Get raw response text first for debugging
      const responseText = await response.text();
      let data: JupiterPriceResponse;
      try {
        data = JSON.parse(responseText) as JupiterPriceResponse;
      } catch (parseError) {
        console.error(`[Jupiter] Failed to parse JSON response:`, parseError);
        console.error(`[Jupiter] Full response text:`, responseText);
        throw new Error(`Invalid JSON response from Jupiter: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
      }

      // Get SOL/USD price for conversion
      const solUsdPrice = this.getSolUsdPrice();
      if (solUsdPrice <= 0) {
        throw new PriceFeedServiceError(
          'Invalid SOL/USD price from Pyth Network',
          'INVALID_SOL_PRICE',
          { tokenAddress }
        );
      }

      const tokenPrice = this.parseTokenPrice(data, tokenAddress, solUsdPrice);

      if (!tokenPrice) {
        throw new PriceFeedServiceError(
          `No price data found for token: ${tokenAddress}. Token may not have been traded in the last 7 days.`,
          'TOKEN_NOT_FOUND',
          { tokenAddress }
        );
      }

      return tokenPrice;
    } catch (error) {
      if (error instanceof PriceFeedServiceError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new PriceFeedServiceError(
          `Failed to get price from Jupiter: ${error.message}`,
          'FETCH_FAILED',
          { tokenAddress, originalError: error.message }
        );
      }

      throw new PriceFeedServiceError(
        `Failed to get price from Jupiter: Unknown error`,
        'FETCH_FAILED',
        { tokenAddress }
      );
    }
  }

  /**
   * Get prices for multiple tokens
   * 
   * Uses Jupiter batch endpoint which supports up to 50 tokens per request.
   * 
   * @param tokenAddresses - Array of token addresses
   * @returns Array of token prices (may be fewer than requested if some fail)
   */
  async getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
      return [];
    }

    // Deduplicate addresses while preserving original case (Jupiter needs original case)
    // Use a Map to track original case for each normalized address
    const addressMap = new Map<string, string>();
    for (const addr of tokenAddresses) {
      const normalized = addr.toLowerCase();
      if (!addressMap.has(normalized)) {
        addressMap.set(normalized, addr); // Keep first occurrence's case
      }
    }
    const uniqueAddresses = Array.from(addressMap.values());
    const results: TokenPrice[] = [];

    // Get SOL/USD price once (reuse for all batches)
    const solUsdPrice = this.getSolUsdPrice();
    if (solUsdPrice <= 0) {
      console.error('[Jupiter] Invalid SOL/USD price from Pyth Network, cannot convert prices');
      return [];
    }

    // Process in batches of 50 (Jupiter limit)
    for (let i = 0; i < uniqueAddresses.length; i += MAX_BATCH_SIZE) {
      const batch = uniqueAddresses.slice(i, i + MAX_BATCH_SIZE);
      // Join addresses with commas - Jupiter expects comma-separated values
      // Don't encode the entire string, just join with commas
      const addressesString = batch.join(',');
      const url = `${this.baseUrl}?ids=${addressesString}`;

      try {
        const response = await this.executeWithRetry(async () => {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };

          // Add API key if available (for Pro tier)
          if (this.apiKey) {
            headers['Authorization'] = `Bearer ${this.apiKey}`;
          }

          const res = await fetch(url, {
            method: 'GET',
            headers,
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => 'Unknown error');
            const error = new Error(`Jupiter API error: ${res.status} ${res.statusText} - ${errorText}`) as Error & { status: number };
            error.status = res.status;
            throw error;
          }

          return res;
        });

        const responseText = await response.text();
        let data: JupiterPriceResponse;
        try {
          data = JSON.parse(responseText) as JupiterPriceResponse;
        } catch (parseError) {
          console.error(`[Jupiter] Failed to parse JSON response:`, parseError);
          console.error(`[Jupiter] Full response text:`, responseText);
          throw new Error(`Invalid JSON response from Jupiter: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
        }

        // Process each token in the batch
        for (const address of batch) {
          const tokenPrice = this.parseTokenPrice(data, address, solUsdPrice);
          if (tokenPrice) {
            results.push(tokenPrice);
          }
        }
      } catch (error) {
        console.error(`[Jupiter] Batch fetch failed for batch starting at index ${i}:`, error);
        // Continue to next batch, don't fail everything
      }
    }

    return results;
  }
}

