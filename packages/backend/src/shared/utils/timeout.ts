/**
 * Timeout utility for async operations
 * 
 * Wraps a promise with a timeout, rejecting if the operation takes too long.
 */

/**
 * Execute a promise with a timeout
 * 
 * @param promise - The promise to execute
 * @param timeoutMs - Timeout in milliseconds
 * @param errorMessage - Custom error message (optional)
 * @returns The result of the promise if it completes within the timeout
 * @throws Error if the operation times out
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage?: string
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage || `Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Default timeout values for external API calls (in milliseconds)
 */
export const API_TIMEOUTS = {
  JUPITER_QUOTE: 10000,      // 10 seconds for swap quotes
  JUPITER_EXECUTE: 30000,    // 30 seconds for swap execution
  DEXSCREENER: 5000,          // 5 seconds for price feeds
  TOKEN_METADATA: 5000,       // 5 seconds for token metadata
  SOLANA_RPC: 10000,          // 10 seconds for Solana RPC calls
} as const;

