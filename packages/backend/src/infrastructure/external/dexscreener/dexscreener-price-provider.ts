/**
 * DexScreener Price Provider
 * 
 * Implementation of price feed provider using DexScreener API
 */

import { BasePriceProvider } from './base-price-provider.js';
import type { TokenPrice } from './types.js';
import { PriceFeedServiceError } from './types.js';

/**
 * DexScreener API base URL
 */
const DEXSCREENER_API_BASE_URL = 'https://api.dexscreener.com/tokens/v1/solana';

/**
 * Rate limit: 300 requests per minute
 */
const RATE_LIMIT_REQUESTS = 300;
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute

/**
 * Token bucket for rate limiting
 */
interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

/**
 * SOL token mint address (for identifying SOL pairs)
 */
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * DexScreener API response structure
 */
interface DexScreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  txns: {
    m5?: { buys: number; sells: number };
    h1?: { buys: number; sells: number };
    h6?: { buys: number; sells: number };
    h24?: { buys: number; sells: number };
  };
  volume: {
    h24?: number;
    h6?: number;
    h1?: number;
    m5?: number;
  };
  priceChange: {
    m5?: number;
    h1?: number;
    h6?: number;
    h24?: number;
  };
  liquidity: {
    usd?: number;
    base?: number;
    quote?: number;
  };
  fdv?: number;
  marketCap?: number;
  pairCreatedAt?: number;
  info?: {
    imageUrl?: string;
    header?: string;
    openGraph?: string;
    websites?: Array<{ url: string; label: string }>;
    socials?: Array<{ url: string; type: string }>;
  };
}

type DexScreenerResponse = DexScreenerPair[];

/**
 * DexScreener Price Provider
 * 
 * Implements price feed functionality using DexScreener API with rate limiting
 */
export class DexScreenerPriceProvider extends BasePriceProvider {
  private rateLimitBucket: TokenBucket;

  constructor() {
    super();
    // Initialize token bucket with full tokens
    this.rateLimitBucket = {
      tokens: RATE_LIMIT_REQUESTS,
      lastRefill: Date.now(),
    };
  }

  /**
   * Get the name of the provider
   */
  getName(): string {
    return 'dexscreener';
  }

  /**
   * Refill rate limit token bucket
   * 
   * Refills tokens based on elapsed time since last refill
   */
  private refillBucket(): void {
    const now = Date.now();
    const elapsed = now - this.rateLimitBucket.lastRefill;
    const tokensToAdd = Math.floor((elapsed / RATE_LIMIT_WINDOW_MS) * RATE_LIMIT_REQUESTS);
    
    if (tokensToAdd > 0) {
      this.rateLimitBucket.tokens = Math.min(
        RATE_LIMIT_REQUESTS,
        this.rateLimitBucket.tokens + tokensToAdd
      );
      this.rateLimitBucket.lastRefill = now;
    }
  }

  /**
   * Check and consume rate limit tokens
   * 
   * @returns true if request can proceed, false if rate limited
   */
  private checkRateLimit(): boolean {
    this.refillBucket();
    
    if (this.rateLimitBucket.tokens >= 1) {
      this.rateLimitBucket.tokens -= 1;
      return true;
    }
    
    return false;
  }

  /**
   * Wait until rate limit allows request
   * 
   * @returns Promise that resolves when rate limit allows request
   */
  private async waitForRateLimit(): Promise<void> {
    while (!this.checkRateLimit()) {
      // Calculate wait time until next token is available
      const now = Date.now();
      const elapsed = now - this.rateLimitBucket.lastRefill;
      const tokensPerMs = RATE_LIMIT_REQUESTS / RATE_LIMIT_WINDOW_MS;
      const msUntilNextToken = (1 / tokensPerMs) - (elapsed % (RATE_LIMIT_WINDOW_MS / RATE_LIMIT_REQUESTS));
      
      // Wait at least 10ms to avoid tight loop
      await new Promise((resolve) => setTimeout(resolve, Math.max(10, msUntilNextToken)));
      this.refillBucket();
    }
  }

  /**
   * Parse DexScreener response to TokenPrice
   * 
   * @param pairs - DexScreener pairs array
   * @param tokenAddress - Token address being queried
   * @returns TokenPrice or null if no valid SOL pair found
   */
  private parseTokenPrice(pairs: DexScreenerResponse, tokenAddress: string): TokenPrice | null {
    // Filter pairs where:
    // 1. quoteToken is SOL (Wrapped SOL)
    // 2. baseToken matches the token we're looking for
    const solPairs = pairs.filter(
      (pair) =>
        pair.quoteToken.address.toLowerCase() === SOL_MINT_ADDRESS.toLowerCase() &&
        pair.baseToken.address.toLowerCase() === tokenAddress.toLowerCase()
    );

    if (solPairs.length === 0) {
      return null;
    }

    // Find the pair with the highest liquidity (USD)
    const bestPair = solPairs.reduce((best, current) => {
      const bestLiquidity = best.liquidity?.usd || 0;
      const currentLiquidity = current.liquidity?.usd || 0;
      return currentLiquidity > bestLiquidity ? current : best;
    });

    const priceSol = parseFloat(bestPair.priceNative) || 0;
    const priceUsd = parseFloat(bestPair.priceUsd) || 0;
    const liquidity = bestPair.liquidity?.usd || 0;
    const priceChange24h = bestPair.priceChange?.h24 || 0;

    if (priceSol <= 0) {
      return null; // Invalid price
    }

    return {
      tokenAddress: tokenAddress.toLowerCase(),
      priceSol,
      priceUsd,
      liquidity,
      priceChange24h,
      lastUpdated: new Date(),
      pairAddress: bestPair.pairAddress,
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

    // Wait for rate limit
    await this.waitForRateLimit();

    const url = `${DEXSCREENER_API_BASE_URL}/${tokenAddress}`;
    console.log(`[DexScreener] Fetching price for token: ${tokenAddress}`);

    try {
      const response = await this.executeWithRetry(async () => {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          const errorText = await res.text().catch(() => 'Unknown error');
          console.error(`[DexScreener] API error for ${tokenAddress}: ${res.status} ${res.statusText} - ${errorText}`);
          const error = new Error(`DexScreener API error: ${res.status} ${res.statusText} - ${errorText}`) as Error & { status: number };
          error.status = res.status;
          throw error;
        }

        return res;
      });

      const data = (await response.json()) as DexScreenerResponse;
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new PriceFeedServiceError(
          `No price data found for token: ${tokenAddress}`,
          'TOKEN_NOT_FOUND',
          { tokenAddress }
        );
      }

      const tokenPrice = this.parseTokenPrice(data, tokenAddress);

      if (!tokenPrice) {
        throw new PriceFeedServiceError(
          `No valid SOL pair found for token: ${tokenAddress}`,
          'NO_SOL_PAIR',
          { tokenAddress, pairsFound: data.length }
        );
      }

      console.log(`[DexScreener] ✅ Price found for ${tokenAddress}: ${tokenPrice.priceSol} SOL, $${tokenPrice.priceUsd} USD`);
      return tokenPrice;
    } catch (error) {
      if (error instanceof PriceFeedServiceError) {
        throw error;
      }

      if (error instanceof Error) {
        throw new PriceFeedServiceError(
          `Failed to get price from DexScreener: ${error.message}`,
          'FETCH_FAILED',
          { tokenAddress, originalError: error.message }
        );
      }

      throw new PriceFeedServiceError(
        `Failed to get price from DexScreener: Unknown error`,
        'FETCH_FAILED',
        { tokenAddress }
      );
    }
  }

  /**
   * Get prices for multiple tokens
   * 
   * Uses DexScreener batch endpoint: https://api.dexscreener.com/tokens/v1/solana/{addresses}
   * Supports up to 30 addresses per request.
   * 
   * @param tokenAddresses - Array of token addresses
   * @returns Array of token prices (may be fewer than requested if some fail)
   */
  async getMultipleTokenPrices(tokenAddresses: string[]): Promise<TokenPrice[]> {
    if (!Array.isArray(tokenAddresses) || tokenAddresses.length === 0) {
      return [];
    }

    // Deduplicate addresses
    const uniqueAddresses = Array.from(new Set(tokenAddresses));
    const results: TokenPrice[] = [];
    const batchSize = 30; // Max addresses per request

    // Process in batches
    for (let i = 0; i < uniqueAddresses.length; i += batchSize) {
      const batch = uniqueAddresses.slice(i, i + batchSize);
      const addressesString = batch.join(',');
      const url = `${DEXSCREENER_API_BASE_URL}/${addressesString}`;

      console.log(`[DexScreener] Fetching batch of ${batch.length} tokens: ${batch.slice(0, 3).join(', ')}...`);

      try {
        // Wait for rate limit
        await this.waitForRateLimit();

        const response = await this.executeWithRetry(async () => {
          const res = await fetch(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!res.ok) {
            const errorText = await res.text().catch(() => 'Unknown error');
            throw new Error(`DexScreener API error: ${res.status} ${res.statusText} - ${errorText}`);
          }

          return res;
        });

        const data = (await response.json()) as DexScreenerResponse;

        if (Array.isArray(data)) {
          // Process all pairs in the response
          // Since one response contains pairs for multiple tokens, we need to group them by base token
          
          // Create a map of tokenAddress -> pairs
          const pairsByToken = new Map<string, DexScreenerPair[]>();
          
          for (const pair of data) {
            const baseAddress = pair.baseToken.address.toLowerCase();
            
            if (!pairsByToken.has(baseAddress)) {
              pairsByToken.set(baseAddress, []);
            }
            pairsByToken.get(baseAddress)!.push(pair);
          }

          // For each requested token in this batch, parse the best price
          for (const address of batch) {
            const normalizedAddress = address.toLowerCase();
            const pairs = pairsByToken.get(normalizedAddress);
            
            if (pairs && pairs.length > 0) {
              const price = this.parseTokenPrice(pairs, address);
              if (price) {
                results.push(price);
              } else {
                console.warn(`[DexScreener] No valid SOL pair found for ${address} in batch response`);
              }
            } else {
              console.warn(`[DexScreener] No pairs found for ${address} in batch response`);
            }
          }
        }
      } catch (error) {
        console.error(`[DexScreener] Batch fetch failed:`, error);
        // Continue to next batch, don't fail everything
      }
    }
    
    console.log(`[DexScreener] Successfully fetched ${results.length}/${uniqueAddresses.length} prices`);
    return results;
  }
}
