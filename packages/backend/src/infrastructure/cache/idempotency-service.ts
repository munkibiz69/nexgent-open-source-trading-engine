/**
 * Idempotency Service
 * 
 * Provides idempotency checks for operations to prevent duplicate execution.
 * Uses Redis to track in-progress operations with TTL-based expiration.
 */

import { redisService } from './redis-client.js';
import { REDIS_KEYS } from '@/shared/constants/redis-keys.js';

export class IdempotencyService {
  private static instance: IdempotencyService;

  private constructor() { }

  public static getInstance(): IdempotencyService {
    if (!IdempotencyService.instance) {
      IdempotencyService.instance = new IdempotencyService();
    }
    return IdempotencyService.instance;
  }

  /**
   * Check if operation can proceed and mark it as in-progress
   * 
   * Uses Redis SET with NX (set if not exists) to atomically check and set.
   * Returns true if operation can proceed (key didn't exist), false if operation already in progress.
   * 
   * @param operationKey - Unique identifier for the operation (e.g., 'sale:position-123')
   * @param ttlSeconds - Time-to-live in seconds (operation expires after this time)
   * @returns true if operation can proceed, false if already in progress
   */
  public async checkAndSet(operationKey: string, ttlSeconds: number): Promise<boolean> {
    try {
      const key = REDIS_KEYS.IDEMPOTENCY(operationKey);

      // Use SET with NX (only set if not exists) and EX (expire after ttlSeconds)
      // Returns 'OK' if key didn't exist (operation can proceed), null if key exists (already in progress)
      const result = await redisService.getClient().set(key, '1', 'EX', ttlSeconds, 'NX');

      return result === 'OK';
    } catch (error) {
      console.error(`Failed to check idempotency for ${operationKey}:`, error);
      // FAIL-CLOSED: Reject operation if we can't verify idempotency
      // This prevents duplicate execution at the cost of availability during Redis outages
      return false;
    }
  }

  /**
   * Clear idempotency key for an operation
   * 
   * Removes the idempotency key, allowing the operation to be retried.
   * Should be called after operation completes (success or failure).
   * 
   * @param operationKey - Unique identifier for the operation
   */
  public async clear(operationKey: string): Promise<void> {
    try {
      const key = REDIS_KEYS.IDEMPOTENCY(operationKey);
      await redisService.del(key);
    } catch (error) {
      console.error(`Failed to clear idempotency key for ${operationKey}:`, error);
      // Don't throw - key will expire naturally if clear fails
    }
  }

  /**
   * Check if operation is already in progress
   * 
   * @param operationKey - Unique identifier for the operation
   * @returns true if operation is in progress, false otherwise
   */
  public async isInProgress(operationKey: string): Promise<boolean> {
    try {
      const key = REDIS_KEYS.IDEMPOTENCY(operationKey);
      const exists = await redisService.exists(key);
      return exists;
    } catch (error) {
      console.error(`Failed to check if operation ${operationKey} is in progress:`, error);
      // On error, assume not in progress (fail-open)
      return false;
    }
  }
}

export const idempotencyService = IdempotencyService.getInstance();

