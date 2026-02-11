/**
 * Jupiter Fee Calculator
 *
 * Extracts protocol (platform) fee and network (Solana) fee from
 * the full Jupiter swap payload stored on agent transactions.
 *
 * Supports both payload shapes:
 *   - Full:  { orderResponse, executeResponse }   (live trades)
 *   - Quote: flat orderResponse only               (simulation)
 *
 * See docs/plans/swap-protocol-and-network-fees.md for details.
 */

const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_DECIMALS = 1e9; // lamports per SOL

/** Result of fee extraction — values in SOL (not lamports). */
export interface JupiterFees {
  /** Jupiter/platform fee in SOL (null if cannot be computed). */
  protocolFeeSol: number | null;
  /** Solana network fees in SOL: signature + prioritization + rent (null if cannot be computed). */
  networkFeeSol: number | null;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Safely parse a value to a number (handles strings, numbers, undefined). */
function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

/**
 * Resolve the two sub-objects from whatever shape the stored payload has.
 *
 * Live trades:  { orderResponse: {...}, executeResponse: {...} }
 * Simulation:   The quote object itself (flat, no executeResponse)
 * Legacy:       Could be either shape; we handle both.
 */
function resolvePayload(payload: unknown): {
  order: Record<string, unknown> | null;
  execute: Record<string, unknown> | null;
} {
  if (!payload || typeof payload !== 'object') return { order: null, execute: null };

  const p = payload as Record<string, unknown>;

  // Full shape: { orderResponse, executeResponse }
  if (p.orderResponse !== undefined || p.executeResponse !== undefined) {
    return {
      order: (p.orderResponse && typeof p.orderResponse === 'object'
        ? p.orderResponse
        : null) as Record<string, unknown> | null,
      execute: (p.executeResponse && typeof p.executeResponse === 'object'
        ? p.executeResponse
        : null) as Record<string, unknown> | null,
    };
  }

  // Legacy / simulation: the payload IS the order (quote) response
  return { order: p, execute: null };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract protocol fee and network fee from a Jupiter swap payload.
 *
 * @param swapPayload - The full swap payload as stored in agent_transactions.swap_payload
 * @returns Fees in SOL (or null when the data is missing / not applicable).
 */
export function extractJupiterFees(swapPayload: unknown): JupiterFees {
  const { order, execute } = resolvePayload(swapPayload);

  return {
    protocolFeeSol: calcProtocolFee(order, execute),
    networkFeeSol: calcNetworkFee(order),
  };
}

// ---------------------------------------------------------------------------
// Protocol fee
// ---------------------------------------------------------------------------

function calcProtocolFee(
  order: Record<string, unknown> | null,
  execute: Record<string, unknown> | null,
): number | null {
  if (!order) return null;

  // Read platformFee from order response
  const platformFee = order.platformFee as Record<string, unknown> | undefined;
  const feeBps = toNum(platformFee?.feeBps ?? order.feeBps);
  const feeMint = (platformFee?.feeMint ?? order.feeMint) as string | undefined;

  if (!feeBps || feeBps <= 0) return 0; // No platform fee configured
  if (feeMint && feeMint !== SOL_MINT) return null; // Fee not in SOL — cannot express as SOL

  // Determine swap direction: which side is SOL?
  const inputMint = order.inputMint as string | undefined;
  const outputMint = order.outputMint as string | undefined;

  const inputIsSol = inputMint === SOL_MINT;
  const outputIsSol = outputMint === SOL_MINT;

  if (!inputIsSol && !outputIsSol) return null; // Neither side is SOL — unexpected

  // Get the SOL-side amount in lamports (actual swap amount, not total)
  let solSideLamports: number;

  if (execute) {
    // Live: use actual swap results
    if (inputIsSol) {
      solSideLamports = toNum(execute.inputAmountResult);
    } else {
      solSideLamports = toNum(execute.outputAmountResult);
    }
  } else {
    // Simulation: use quote amounts
    if (inputIsSol) {
      solSideLamports = toNum(order.inAmount);
    } else {
      solSideLamports = toNum(order.outAmount);
    }
  }

  if (!solSideLamports) return null;

  const feeLamports = solSideLamports * (feeBps / 10000);
  return feeLamports / SOL_DECIMALS;
}

// ---------------------------------------------------------------------------
// Network fee
// ---------------------------------------------------------------------------

function calcNetworkFee(order: Record<string, unknown> | null): number | null {
  if (!order) return null;

  const signature = toNum(order.signatureFeeLamports);
  const priority = toNum(order.prioritizationFeeLamports);
  const rent = toNum(order.rentFeeLamports);

  const totalLamports = signature + priority + rent;

  // If all are zero/missing, return 0 (it's still a valid answer: no network fees estimated)
  return totalLamports / SOL_DECIMALS;
}
