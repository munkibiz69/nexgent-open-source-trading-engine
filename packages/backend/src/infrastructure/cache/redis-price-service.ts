/**
 * Redis Price Service
 * 
 * Handles caching of token prices in Redis.
 * Optimized for high-frequency updates.
 */

import { redisService } from './redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';

export interface CachedPrice {
  priceSol: number;
  priceUsd: number;
  lastUpdated: Date;
}

export class RedisPriceService {
  private static instance: RedisPriceService;

  private constructor() {}

  public static getInstance(): RedisPriceService {
    if (!RedisPriceService.instance) {
      RedisPriceService.instance = new RedisPriceService();
    }
    return RedisPriceService.instance;
  }

  /**
   * Get price from cache
   */
  public async getPrice(tokenAddress: string): Promise<CachedPrice | null> {
    const key = REDIS_KEYS.PRICE(tokenAddress);
    const data = await redisService.get(key);
    
    if (!data) return null;
    
    try {
      const price = JSON.parse(data);
      return {
        ...price,
        lastUpdated: new Date(price.lastUpdated),
      };
    } catch (error) {
      console.error(`Failed to parse cached price for ${tokenAddress}:`, error);
      return null;
    }
  }

  /**
   * Set price in cache
   * No TTL - prices are refreshed every 1.5s when positions exist, last known price should persist during gaps
   */
  public async setPrice(tokenAddress: string, price: CachedPrice): Promise<void> {
    const key = REDIS_KEYS.PRICE(tokenAddress);
    await redisService.set(key, JSON.stringify(price)); // No TTL - refreshed constantly
  }

  /**
   * Set multiple prices in cache (pipeline)
   * No TTL - prices are refreshed every 1.5s when positions exist, last known price should persist during gaps
   */
  public async setMultiplePrices(prices: Map<string, CachedPrice>): Promise<void> {
    if (prices.size === 0) return;

    const pipeline = redisService.getClient().pipeline();

    for (const [tokenAddress, price] of prices.entries()) {
      const key = REDIS_KEYS.PRICE(tokenAddress);
      pipeline.set(key, JSON.stringify(price)); // No TTL - refreshed constantly
    }

    await pipeline.exec();
  }

  /**
   * Get multiple prices from cache (pipeline)
   */
  public async getMultiplePrices(tokenAddresses: string[]): Promise<Map<string, CachedPrice | null>> {
    if (tokenAddresses.length === 0) return new Map();

    const pipeline = redisService.getClient().pipeline();
    
    for (const address of tokenAddresses) {
      pipeline.get(REDIS_KEYS.PRICE(address));
    }

    const results = await pipeline.exec();
    const priceMap = new Map<string, CachedPrice | null>();

    if (!results) return priceMap;

    tokenAddresses.forEach((address, index) => {
      const [error, data] = results[index];
      
      if (error || !data) {
        priceMap.set(address, null);
        return;
      }

      try {
        const price = JSON.parse(data as string);
        priceMap.set(address, {
          ...price,
          lastUpdated: new Date(price.lastUpdated),
        });
      } catch (_e) {
        priceMap.set(address, null);
      }
    });

    return priceMap;
  }
}

export const redisPriceService = RedisPriceService.getInstance();

