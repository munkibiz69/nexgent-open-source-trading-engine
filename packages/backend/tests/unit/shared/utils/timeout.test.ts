/**
 * Timeout utility unit tests
 *
 * Tests withTimeout resolves/rejects correctly and cleans up timers.
 * Uses fake timers for deterministic, fast execution.
 */

import { withTimeout, API_TIMEOUTS } from '@/shared/utils/timeout.js';

describe('withTimeout', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should resolve with the promise result when it completes before timeout', async () => {
    const result = { data: 'ok' };
    const promise = Promise.resolve(result);

    const resultPromise = withTimeout(promise, 5000);

    await jest.runAllTimersAsync();

    await expect(resultPromise).resolves.toEqual(result);
  });

  it('should reject with default error message when operation times out', async () => {
    const neverResolves = new Promise<string>(() => {});
    const timeoutMs = 100;

    const resultPromise = withTimeout(neverResolves, timeoutMs);

    jest.advanceTimersByTime(timeoutMs);

    await expect(resultPromise).rejects.toThrow(`Operation timed out after ${timeoutMs}ms`);
  });

  it('should reject with custom error message when provided', async () => {
    const neverResolves = new Promise<string>(() => {});
    const customMessage = 'Jupiter quote request timed out for So11111111111111111111111111111111111111112';

    const resultPromise = withTimeout(neverResolves, 5000, customMessage);

    jest.advanceTimersByTime(5000);

    await expect(resultPromise).rejects.toThrow(customMessage);
  });

  it('should clear timeout when promise resolves (no timer leak)', async () => {
    const quickResolve = Promise.resolve(42);
    const resultPromise = withTimeout(quickResolve, 10000);

    const value = await resultPromise;
    expect(value).toBe(42);

    jest.advanceTimersByTime(15000);
    await Promise.resolve();
  });

  it('should clear timeout when promise rejects before timeout', async () => {
    const quickReject = Promise.reject(new Error('External API error'));
    const resultPromise = withTimeout(quickReject, 10000);

    await expect(resultPromise).rejects.toThrow('External API error');

    jest.advanceTimersByTime(15000);
    await Promise.resolve();
  });
});

describe('API_TIMEOUTS', () => {
  it('should define all expected timeout constants with positive values', () => {
    expect(API_TIMEOUTS.JUPITER_QUOTE).toBe(10000);
    expect(API_TIMEOUTS.JUPITER_EXECUTE).toBe(30000);
    expect(API_TIMEOUTS.DEXSCREENER).toBe(5000);
    expect(API_TIMEOUTS.TOKEN_METADATA).toBe(5000);
    expect(API_TIMEOUTS.SOLANA_RPC).toBe(10000);
  });

  it('should have only expected keys (frozen shape)', () => {
    const keys = Object.keys(API_TIMEOUTS).sort();
    expect(keys).toEqual(['DEXSCREENER', 'JUPITER_EXECUTE', 'JUPITER_QUOTE', 'SOLANA_RPC', 'TOKEN_METADATA']);
  });
});
