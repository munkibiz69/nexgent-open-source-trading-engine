/**
 * Token Metadata Service
 * 
 * Fetches token metadata (decimals, symbol, etc.) from Solana blockchain
 */

import { Connection, PublicKey } from '@solana/web3.js';

/**
 * Token Metadata Service Error
 */
export class TokenMetadataServiceError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'TokenMetadataServiceError';
  }
}

/**
 * Token metadata information
 */
export interface TokenMetadata {
  address: string;
  decimals: number;
  symbol?: string;
  name?: string;
}

/**
 * Token Metadata Service
 * 
 * Singleton service for fetching token metadata from Solana blockchain
 */
class TokenMetadataService {
  private connection: Connection | null = null;
  private readonly SOL_DECIMALS = 9;
  private readonly SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
  private decimalsCache: Map<string, number> = new Map();

  /**
   * Initialize the service with Solana RPC connection
   */
  initialize(rpcUrl?: string): void {
    if (this.connection) {
      return; // Already initialized
    }

    const url = rpcUrl || process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    this.connection = new Connection(url, 'confirmed');
    
    // Pre-populate SOL decimals
    this.decimalsCache.set(this.SOL_MINT_ADDRESS, this.SOL_DECIMALS);
    
    console.log(`✅ TokenMetadataService initialized with RPC URL: ${url}`);
  }

  /**
   * Get token decimals
   * 
   * @param tokenAddress - Token mint address
   * @returns Token decimals (number of decimal places)
   * @throws TokenMetadataServiceError if fetch fails
   */
  async getTokenDecimals(tokenAddress: string): Promise<number> {
    // Check cache first
    if (this.decimalsCache.has(tokenAddress)) {
      return this.decimalsCache.get(tokenAddress)!;
    }

    // SOL has fixed decimals
    if (tokenAddress.toLowerCase() === this.SOL_MINT_ADDRESS.toLowerCase()) {
      this.decimalsCache.set(tokenAddress, this.SOL_DECIMALS);
      return this.SOL_DECIMALS;
    }

    if (!this.connection) {
      this.initialize();
    }

    try {
      const mintPublicKey = new PublicKey(tokenAddress);
      
      // Fetch mint account info using RPC
      // Mint accounts have a specific structure: https://spl.solana.com/token#finding-a-token-account
      // The decimals are stored at offset 44 in the account data
      const accountInfo = await this.connection!.getAccountInfo(mintPublicKey);
      
      if (!accountInfo) {
        throw new Error(`Token account not found: ${tokenAddress}`);
      }

      // Mint account data structure:
      // - Bytes 0-35: mint authority (Pubkey, 32 bytes) + option flag (1 byte) + padding (2 bytes)
      // - Bytes 36-43: supply (u64, 8 bytes)
      // - Bytes 44: decimals (u8, 1 byte)
      // - Bytes 45-76: is_initialized (bool, 1 byte) + freeze_authority (Pubkey, 32 bytes) + option flag (1 byte) + padding (2 bytes)
      
      if (accountInfo.data.length < 45) {
        throw new Error(`Invalid mint account data length: ${accountInfo.data.length}`);
      }

      const decimals = accountInfo.data[44];

      // Cache the result
      this.decimalsCache.set(tokenAddress, decimals);

      return decimals;
    } catch (error) {
      console.error(`Failed to fetch decimals for token ${tokenAddress}:`, error);
      
      // Default to 9 decimals (most common) if fetch fails
      const defaultDecimals = 9;
      console.warn(`Using default decimals (${defaultDecimals}) for token ${tokenAddress}`);
      this.decimalsCache.set(tokenAddress, defaultDecimals);
      return defaultDecimals;
    }
  }

  /**
   * Convert amount from smallest unit to token amount
   * 
   * @param amount - Amount in smallest unit (e.g., lamports)
   * @param tokenAddress - Token mint address
   * @returns Amount in token units
   */
  async convertFromSmallestUnit(amount: number, tokenAddress: string): Promise<number> {
    const decimals = await this.getTokenDecimals(tokenAddress);
    return amount / Math.pow(10, decimals);
  }

  /**
   * Convert amount from token units to smallest unit
   * 
   * @param amount - Amount in token units
   * @param tokenAddress - Token mint address
   * @returns Amount in smallest unit (e.g., lamports)
   */
  async convertToSmallestUnit(amount: number, tokenAddress: string): Promise<number> {
    const decimals = await this.getTokenDecimals(tokenAddress);
    return Math.floor(amount * Math.pow(10, decimals));
  }

  /**
   * Clear the decimals cache
   */
  clearCache(): void {
    this.decimalsCache.clear();
  }
}

export const tokenMetadataService = new TokenMetadataService();

