/**
 * Agent Balance API types
 * Shared between frontend and backend
 */

/**
 * Request body for creating an agent balance
 */
export interface CreateAgentBalanceRequest {
  agentId: string;
  walletAddress?: string;
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
}

/**
 * Request body for updating an agent balance
 */
export interface UpdateAgentBalanceRequest {
  balance?: string;
  tokenSymbol?: string;
}

/**
 * Agent balance response
 */
export interface AgentBalanceResponse {
  id: string;
  agentId: string;
  walletAddress: string;
  tokenAddress: string;
  tokenSymbol: string;
  balance: string;
  lastUpdated: Date;
  priceSol?: number; // Optional: Price per token in SOL (enriched from price cache)
}

