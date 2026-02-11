/**
 * Wallet Store
 * 
 * In-memory storage for loaded wallet private keys.
 * Wallets are loaded from environment variables at startup and available immediately.
 */

import { Keypair } from '@solana/web3.js';
import type { LoadedWallet } from './wallet-loader.js';

/**
 * Wallet Store
 * 
 * Singleton service for storing loaded wallet keys in memory.
 * Keys are loaded from environment variables at startup via WalletLoader.
 */
class WalletStore {
  private wallets: Map<string, LoadedWallet> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize wallets from loader at startup
   * Called once during app boot.
   * Map key is wallet address (public key), not env var name.
   * 
   * @param wallets - Map of wallet address to wallet data from WalletLoader
   */
  initialize(wallets: Map<string, LoadedWallet>): void {
    if (this.initialized) {
      console.warn('[WalletStore] Already initialized, skipping');
      return;
    }

    this.wallets = new Map(wallets);
    this.initialized = true;
    console.log(`[WalletStore] ✅ Initialized with ${this.wallets.size} wallet(s)`);
    
    if (this.wallets.size > 0) {
      const addresses = Array.from(this.wallets.keys());
      console.log(`[WalletStore]   Available addresses: ${addresses.join(', ')}`);
    }
  }

  /**
   * Get wallet by address (public key)
   * Returns null if not found
   * 
   * @param address - Wallet public key (address)
   * @returns Wallet data or null if not found
   */
  getWallet(address: string): LoadedWallet | null {
    const wallet = this.wallets.get(address);
    if (!wallet) {
      return null;
    }
    // Return a copy to prevent external mutations
    return {
      publicKey: wallet.publicKey,
      secretKey: new Uint8Array(wallet.secretKey),
    };
  }

  /**
   * Get all loaded wallet addresses
   * Used for UI to show available wallets
   * 
   * @returns Array of wallet addresses
   */
  getAllWalletAddresses(): string[] {
    return Array.from(this.wallets.keys());
  }

  /**
   * Check if wallet is available (always true after initialization if wallet exists)
   * 
   * @param address - Wallet public key (address)
   * @returns true if wallet is loaded and available
   */
  isWalletAvailable(address: string): boolean {
    return this.wallets.has(address);
  }

  /**
   * Get Keypair for signing transactions
   * Returns null if wallet not found
   * 
   * @param address - Wallet public key (address)
   * @returns Solana Keypair or null if wallet not found
   */
  getKeypair(address: string): Keypair | null {
    const wallet = this.wallets.get(address);
    if (!wallet) {
      return null;
    }
    // Create keypair from secret key (returns new instance)
    return Keypair.fromSecretKey(wallet.secretKey);
  }

  /**
   * Clear all wallets from memory (for testing or shutdown)
   */
  clearAll(): void {
    // Clear secret keys from memory
    for (const wallet of this.wallets.values()) {
      wallet.secretKey.fill(0);
    }
    this.wallets.clear();
    this.initialized = false;
  }

  /**
   * Get number of loaded wallets
   * 
   * @returns Number of loaded wallets
   */
  getLoadedCount(): number {
    return this.wallets.size;
  }

  /**
   * Check if store has been initialized
   * 
   * @returns true if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export singleton instance
export const walletStore = new WalletStore();
