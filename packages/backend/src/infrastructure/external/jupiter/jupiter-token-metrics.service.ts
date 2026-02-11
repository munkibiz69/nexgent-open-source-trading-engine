/**
 * Jupiter Token Metrics Service
 *
 * Fetches token metrics (market cap, liquidity, holder count) from Jupiter Tokens API v2.
 * Used as a signal pre-check: one call per signal, result reused for all agents.
 * @see https://dev.jup.ag/api-reference/tokens/v2/search
 */

import { withTimeout } from '@/shared/utils/timeout.js';
import logger from '@/infrastructure/logging/logger.js';

const JUPITER_TOKENS_V2_SEARCH_URL = 'https://api.jup.ag/tokens/v2/search';
const TOKEN_METRICS_TIMEOUT_MS = 8000;

/**
 * Token metrics returned from Jupiter (subset of MintInformation).
 * All fields can be null if API does not return them.
 */
export interface TokenMetrics {
  mcap: number | null;
  liquidity: number | null;
  holderCount: number | null;
}

/**
 * Raw MintInformation item from Jupiter Tokens API v2 search response.
 */
interface JupiterMintInformation {
  id?: string;
  mcap?: number | null;
  liquidity?: number | null;
  holderCount?: number | null;
  [key: string]: unknown;
}

function getJupiterApiKey(): string | undefined {
  return process.env.JUPITER_API_KEY;
}

/**
 * Fetch token metrics for a single mint address.
 * One API call per token; result is reused across all agents for that signal.
 *
 * @param tokenAddress - Solana token mint address
 * @returns TokenMetrics or null if token not found, API error, or timeout
 */
export async function fetchTokenMetrics(tokenAddress: string): Promise<TokenMetrics | null> {
  const apiKey = getJupiterApiKey();
  if (!apiKey) {
    logger.warn('[JupiterTokenMetrics] JUPITER_API_KEY not set; skipping token metrics fetch');
    return null;
  }

  const url = `${JUPITER_TOKENS_V2_SEARCH_URL}?query=${encodeURIComponent(tokenAddress)}`;

  try {
    const response = await withTimeout(
      fetch(url, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
      }),
      TOKEN_METRICS_TIMEOUT_MS,
      `Jupiter token metrics request timed out for ${tokenAddress}`
    );

    if (!response.ok) {
      const text = await response.text();
      logger.warn(
        { tokenAddress, status: response.status, body: text.slice(0, 200) },
        '[JupiterTokenMetrics] API error'
      );
      return null;
    }

    const data = (await response.json()) as JupiterMintInformation[];
    if (!Array.isArray(data) || data.length === 0) {
      logger.debug({ tokenAddress }, '[JupiterTokenMetrics] Token not found or empty response');
      return null;
    }

    const first = data[0] as JupiterMintInformation;
    const metrics: TokenMetrics = {
      mcap: first.mcap ?? null,
      liquidity: first.liquidity ?? null,
      holderCount: first.holderCount ?? null,
    };

    return metrics;
  } catch (error) {
    logger.warn(
      { tokenAddress, error: error instanceof Error ? error.message : String(error) },
      '[JupiterTokenMetrics] Failed to fetch token metrics'
    );
    return null;
  }
}
