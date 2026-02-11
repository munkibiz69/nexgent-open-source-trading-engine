/**
 * Swap Service Types
 * 
 * Types for swap execution and quote requests/responses
 */

/**
 * Swap quote request
 */
export interface SwapQuoteRequest {
  inputMint: string;        // Token address to swap from (e.g., SOL)
  outputMint: string;       // Token address to swap to
  amount: number;           // Amount in native units (lamports for SOL)
  walletAddress?: string;   // Optional wallet address (required for some providers)
}

/**
 * Swap quote response from provider
 */
export interface SwapQuote {
  requestId: string;        // Unique request ID for executing the swap
  inputAmount: number;      // Input amount in native units
  outputAmount: number;     // Expected output amount in native units
  priceImpact: number;      // Price impact percentage
  slippageBps: number;      // Slippage in basis points
  transaction: string | null; // Base64-encoded transaction (for live execution, null if taker not provided)
  routes?: unknown | null;    // Routing information (provider-specific)
  swapType?: string;          // Type of swap (e.g., "aggregator", "rfq")
  swapPayload?: unknown | null; // Full Jupiter API response payload
}

/**
 * Swap execution request
 */
export interface SwapExecuteRequest {
  quote: SwapQuote;         // Quote from getQuote()
  walletAddress: string;    // Wallet address for keypair lookup (for live mode)
  isSimulation: boolean;    // Whether this is simulation mode
}

/**
 * Swap execution result
 */
export interface SwapResult {
  success: boolean;
  transactionHash: string | null;  // On-chain transaction hash (null for simulation)
  inputAmount: number;      // Swap input amount (native units) - used for price calculation
  outputAmount: number;     // Actual output amount (may differ from quote due to slippage)
  /** Total input token debited (native units). Includes swap + protocol fee (NOT network fees). Live only. */
  totalInputAmount?: number;
  /** Total output token credited (native units). Includes swap minus protocol fee (NOT network fees). Live only. */
  totalOutputAmount?: number;
  actualPrice: number;      // Actual price (inputAmount / outputAmount)
  fees: number;             // Fees paid
  slippage: number;         // Actual slippage percentage
  priceImpact: number;      // Actual price impact percentage
  routes?: unknown;         // Routing information used
  swapPayload?: unknown | null; // Full Jupiter API response payload
}

/**
 * Swap provider interface
 * 
 * All swap providers must implement this interface
 */
export interface SwapProvider {
  /**
   * Get a quote for a swap
   * 
   * @param request - Swap quote request
   * @returns Swap quote with expected output and transaction data
   * @throws SwapServiceError if quote fails
   */
  getQuote(request: SwapQuoteRequest): Promise<SwapQuote>;

  /**
   * Execute a swap based on a quote
   * 
   * @param request - Swap execution request
   * @returns Swap result with actual amounts and transaction hash
   * @throws SwapServiceError if execution fails
   */
  executeSwap(request: SwapExecuteRequest): Promise<SwapResult>;

  /**
   * Get the name of the provider
   */
  getName(): string;
}

/**
 * Swap service error
 */
export class SwapServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SwapServiceError';
  }
}

