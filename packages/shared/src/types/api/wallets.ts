/**
 * Wallet API types
 * Shared between frontend and backend
 */

/**
 * Wallet list item (agent wallet)
 * Network can be derived from walletType: simulation = testnet, live = mainnet
 */
export interface WalletListItem {
  walletAddress: string;
  walletType: 'simulation' | 'live';
  isAvailable: boolean; // For live wallets: true if loaded from env, false otherwise. For simulation: always true.
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Available wallet from environment variables
 */
export interface AvailableWallet {
  walletAddress: string;
  isAssigned: boolean; // Indicates if this available wallet is already assigned to an agent
}

/**
 * Response for listing wallets
 * Returns both agent wallets and available wallets from environment
 */
export interface ListWalletsResponse {
  agentWallets: WalletListItem[];
  availableWallets: AvailableWallet[];
}

/**
 * Request body for assigning a wallet to an agent
 */
export interface AssignWalletRequest {
  agentId: string;
  walletAddress: string;
  walletType: 'simulation' | 'live';
}

/**
 * Response from assigning a wallet
 */
export interface AssignWalletResponse {
  success: boolean;
  walletAddress: string;
  walletType: 'simulation' | 'live';
  message: string;
}
