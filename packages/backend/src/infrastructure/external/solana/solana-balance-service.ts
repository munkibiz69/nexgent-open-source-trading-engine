/**
 * Solana Balance Service
 * 
 * Fetches on-chain SOL balances from Solana blockchain via RPC.
 * Used for checking deposits to live wallets.
 */

import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';

/**
 * Solana Balance Service Error
 */
export class SolanaBalanceServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'SolanaBalanceServiceError';
  }
}

/**
 * Balance check result
 */
export interface OnChainBalanceResult {
  walletAddress: string;
  balanceLamports: number;
  balanceSol: number;
}

/**
 * Solana Balance Service
 * 
 * Singleton service for fetching on-chain SOL balances from Solana blockchain.
 * Shares RPC configuration with TokenMetadataService.
 */
class SolanaBalanceService {
  private connection: Connection | null = null;

  /**
   * Initialize the service with Solana RPC connection
   */
  initialize(rpcUrl?: string): void {
    if (this.connection) {
      return; // Already initialized
    }

    const url = rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(url, 'confirmed');
    
    console.log(`[SolanaBalanceService] ✅ Initialized with RPC URL: ${url}`);
  }

  /**
   * Get the Connection instance, initializing if needed
   */
  private getConnection(): Connection {
    if (!this.connection) {
      this.initialize();
    }
    return this.connection!;
  }

  /**
   * Validate a Solana wallet address
   * 
   * @param address - Wallet address to validate
   * @returns true if valid Solana address
   */
  isValidAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get on-chain SOL balance for a wallet address
   * 
   * @param walletAddress - Solana wallet address (base58)
   * @returns Balance in SOL and lamports
   * @throws SolanaBalanceServiceError if fetch fails
   */
  async getOnChainBalance(walletAddress: string): Promise<OnChainBalanceResult> {
    // Validate address format
    if (!this.isValidAddress(walletAddress)) {
      throw new SolanaBalanceServiceError(
        `Invalid Solana address: ${walletAddress}`,
        'INVALID_ADDRESS',
        { walletAddress }
      );
    }

    // Reject simulation addresses
    if (walletAddress.startsWith('sim_')) {
      throw new SolanaBalanceServiceError(
        'Cannot check on-chain balance for simulation wallets',
        'SIMULATION_WALLET',
        { walletAddress }
      );
    }

    try {
      const connection = this.getConnection();
      const publicKey = new PublicKey(walletAddress);
      
      const balanceLamports = await connection.getBalance(publicKey);
      const balanceSol = balanceLamports / LAMPORTS_PER_SOL;

      console.log(`[SolanaBalanceService] 💰 Balance for ${walletAddress.slice(0, 8)}...: ${balanceSol} SOL (${balanceLamports} lamports)`);

      return {
        walletAddress,
        balanceLamports,
        balanceSol,
      };
    } catch (error) {
      if (error instanceof SolanaBalanceServiceError) {
        throw error;
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[SolanaBalanceService] ❌ Failed to fetch balance for ${walletAddress}:`, message);
      
      throw new SolanaBalanceServiceError(
        `Failed to fetch on-chain balance: ${message}`,
        'RPC_ERROR',
        { walletAddress, originalError: message }
      );
    }
  }
}

// Export singleton instance
export const solanaBalanceService = new SolanaBalanceService();

