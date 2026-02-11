/**
 * Wallet Loader
 * 
 * Loads wallets from environment variables at application startup.
 * Supports WALLET_1, WALLET_2, WALLET_3, etc. in multiple formats:
 * - Base58 string (Phantom export style): 32-byte seed or 64-byte secret key
 * - JSON array (Solana CLI keypair file): [1,2,3,...] (64 bytes)
 */

import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

/**
 * Loaded wallet structure
 */
export interface LoadedWallet {
  publicKey: string;       // Base58 wallet address (used as unique identifier)
  secretKey: Uint8Array;   // Raw private key (64 bytes)
}

/**
 * Wallet loading error
 */
export interface WalletLoadError {
  envKey: string;          // Environment variable key (e.g., "WALLET_1")
  error: string;           // Error message
}

/**
 * Wallet loading result
 */
export interface WalletLoaderResult {
  wallets: Map<string, LoadedWallet>; // Key: wallet address, Value: wallet data
  errors: WalletLoadError[];
}

/**
 * Wallet Loader
 * 
 * Loads wallets from environment variables and validates them.
 */
export class WalletLoader {
  /**
   * Load all wallets from environment variables
   * 
   * Scans for WALLET_1, WALLET_2, WALLET_3, etc. and loads each one.
   * Derives public key (wallet address) from secret key.
   * 
   * @returns Map of wallet address to wallet data, plus any errors
   */
  loadWallets(): WalletLoaderResult {
    const wallets = new Map<string, LoadedWallet>();
    const errors: WalletLoadError[] = [];

    // Scan for WALLET_1, WALLET_2, etc.
    let walletIndex = 1;
    while (true) {
      const envKey = `WALLET_${walletIndex}`;
      const envValue = process.env[envKey];

      // Stop if no more wallet env vars found
      if (!envValue) {
        break;
      }

      // Parse and validate wallet
      const wallet = this.parseEnvWallet(envKey, envValue);

      if (wallet) {
        // Check for duplicate addresses
        if (wallets.has(wallet.publicKey)) {
          errors.push({
            envKey,
            error: `Duplicate wallet address: ${wallet.publicKey}`,
          });
        } else {
          wallets.set(wallet.publicKey, wallet);
        }
      } else {
        errors.push({
          envKey,
          error: 'Failed to parse wallet (invalid format or secret key)',
        });
      }

      walletIndex++;
    }

    return { wallets, errors };
  }

  /**
   * Parse wallet from environment variable
   * 
   * Supports multiple formats:
   * - Base58 string (Phantom export): 32-byte seed or 64-byte secret key
   * - JSON array (Solana CLI): [1,2,3,...] (64 bytes)
   * 
   * @param envKey - Environment variable key (e.g., "WALLET_1")
   * @param value - Environment variable value (Base58 string or JSON array)
   * @returns Loaded wallet or null if invalid
   */
  private parseEnvWallet(envKey: string, value: string): LoadedWallet | null {
    const trimmed = value.trim();

    // Reject simulation addresses (sim_ prefix) - these should not be in env vars
    if (trimmed.startsWith('sim_')) {
      console.error(`[WalletLoader] ${envKey}: Simulation addresses (sim_*) cannot be loaded from environment variables. Simulation wallets are auto-generated.`);
      return null;
    }

    // Case 1: Base58 string (Phantom export or similar)
    // If it doesn't start with "[" it's almost certainly Base58
    if (!trimmed.startsWith('[')) {
      try {
        const decoded = bs58.decode(trimmed);

        let keypair: Keypair;
        if (decoded.length === 32) {
          // 32-byte seed (Phantom-style export)
          keypair = Keypair.fromSeed(decoded);
        } else if (decoded.length === 64) {
          // 64-byte secret key (some wallets export full secret key as Base58)
          keypair = Keypair.fromSecretKey(decoded);
        } else {
          console.error(`[WalletLoader] ${envKey}: Unsupported Base58 key length: ${decoded.length} (expected 32 or 64 bytes)`);
          return null;
        }

        return {
          publicKey: keypair.publicKey.toBase58(),
          secretKey: new Uint8Array(keypair.secretKey),
        };
      } catch (error) {
        console.error(`[WalletLoader] ${envKey}: Invalid Base58 wallet private key:`, error);
        return null;
      }
    }

    // Case 2: JSON array (Solana CLI keypair file format)
    try {
      const arr = JSON.parse(trimmed);

      if (!Array.isArray(arr)) {
        console.error(`[WalletLoader] ${envKey}: Value is not a JSON array`);
        return null;
      }

      // Validate length (Solana secret key is 64 bytes)
      if (arr.length !== 64) {
        console.error(`[WalletLoader] ${envKey}: Secret key must be exactly 64 bytes, got ${arr.length}`);
        return null;
      }

      // Validate all values are numbers between 0-255
      for (let i = 0; i < arr.length; i++) {
        const byte = arr[i];
        if (typeof byte !== 'number' || byte < 0 || byte > 255 || !Number.isInteger(byte)) {
          console.error(`[WalletLoader] ${envKey}: Invalid byte at index ${i}: ${byte}`);
          return null;
        }
      }

      // Convert to Uint8Array and create keypair
      const secretKey = Uint8Array.from(arr);
      const keypair = Keypair.fromSecretKey(secretKey);

      return {
        publicKey: keypair.publicKey.toBase58(),
        secretKey: new Uint8Array(keypair.secretKey),
      };
    } catch (error) {
      console.error(`[WalletLoader] ${envKey}: Invalid JSON keypair format:`, error);
      return null;
    }
  }

}

