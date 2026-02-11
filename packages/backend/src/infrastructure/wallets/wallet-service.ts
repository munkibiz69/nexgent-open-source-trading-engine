/**
 * Wallet Service
 * 
 * Handles wallet generation for Solana wallets.
 * Used for auto-creating simulation wallets.
 */

import { Keypair } from '@solana/web3.js';
import * as crypto from 'node:crypto';
import bs58 from 'bs58';

/**
 * Wallet generation result
 */
export interface WalletGenerationResult {
  publicKey: string;      // Base58 encoded public key (wallet address)
  secretKey: Uint8Array;  // Raw private key (64 bytes)
}

/**
 * Simulation wallet address result
 */
export interface SimulationWalletAddress {
  address: string;  // Prefixed simulation address (sim_...)
}

/**
 * Wallet Service
 * 
 * Provides methods for generating Solana wallets.
 * Used for auto-creating simulation wallets (no private key storage needed).
 */
export class WalletService {
  /**
   * Generate a new Solana wallet keypair
   * Used for creating live wallets (requires private key for signing).
   * 
   * @returns Public key (address) and secret key
   */
  generateWallet(): WalletGenerationResult {
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toBase58();
    const secretKey = keypair.secretKey;

    return {
      publicKey,
      secretKey,
    };
  }

  /**
   * Generate a simulation wallet address
   * 
   * Creates a non-valid Solana address with `sim_` prefix for safety.
   * This prevents accidental transfers to simulation wallets.
   * 
   * The address is a random Base58 string prefixed with `sim_` to make it
   * clearly invalid and prevent accidental on-chain transfers.
   * 
   * Note: Database column is VarChar(44), so we use 27 bytes (Base58 ~37 chars) + 
   * `sim_` prefix (4 chars) = ~41 chars total, safely under the 44 char limit.
   * 
   * @returns Simulation wallet address (prefixed with sim_)
   */
  generateSimulationAddress(): SimulationWalletAddress {
    // Generate 27 random bytes (Base58 encoded ~37 chars + 4 char prefix = ~41 chars total)
    // This fits within the database VarChar(44) constraint
    const randomBytes = crypto.randomBytes(27);
    
    // Encode to Base58 (similar format to Solana addresses)
    const base58String = bs58.encode(randomBytes);
    
    // Prefix with sim_ to make it clearly invalid and prevent accidental transfers
    const address = `sim_${base58String}`;

    // Safety check: ensure we don't exceed 44 characters (database constraint)
    if (address.length > 44) {
      // Truncate if somehow we exceeded (shouldn't happen with 27 bytes, but safety check)
      return { address: address.substring(0, 44) };
    }

    return { address };
  }
}

// Export singleton instance
export const walletService = new WalletService();
