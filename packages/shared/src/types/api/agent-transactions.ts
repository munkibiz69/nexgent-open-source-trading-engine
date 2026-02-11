/**
 * Agent Transaction API types
 * Shared between frontend and backend
 */

// Transaction types matching Prisma schema
export type TransactionType = 'SWAP' | 'DEPOSIT' | 'BURN';

/**
 * Request body for creating an agent transaction
 */
export interface CreateAgentTransactionRequest {
  agentId: string;
  walletAddress?: string;
  transactionType: TransactionType;
  transactionValueUsd: number | string;
  transactionTime: string;
  destinationAddress?: string | null;
  signalId?: number | null;
  fees?: number | string | null;
  routes?: any | null;
  inputMint?: string | null;
  inputSymbol?: string | null;
  inputAmount?: number | string | null;
  inputPrice?: number | string | null;
  outputMint?: string | null;
  outputSymbol?: string | null;
  outputAmount?: number | string | null;
  outputPrice?: number | string | null;
  slippage?: number | string | null;
  priceImpact?: number | string | null;
  isDca?: boolean;
}

/**
 * Request body for updating an agent transaction
 */
export interface UpdateAgentTransactionRequest {
  transactionType?: TransactionType;
  transactionValueUsd?: number | string;
  transactionTime?: string;
  destinationAddress?: string | null;
  signalId?: number | null;
  fees?: number | string | null;
  routes?: any | null;
  inputMint?: string | null;
  inputSymbol?: string | null;
  inputAmount?: number | string | null;
  inputPrice?: number | string | null;
  outputMint?: string | null;
  outputSymbol?: string | null;
  outputAmount?: number | string | null;
  outputPrice?: number | string | null;
  slippage?: number | string | null;
  priceImpact?: number | string | null;
  isDca?: boolean;
  isTakeProfit?: boolean;
}

/**
 * Agent Transaction response
 */
export interface AgentTransactionResponse {
  id: string;
  agentId: string;
  walletAddress: string | null;
  transactionType: TransactionType;
  transactionValueUsd: string;
  transactionTime: Date;
  destinationAddress: string | null;
  signalId: number | null;
  fees: string | null;
  routes: any | null;
  inputMint: string | null;
  inputSymbol: string | null;
  inputAmount: string | null;
  inputPrice: string | null;
  outputMint: string | null;
  outputSymbol: string | null;
  outputAmount: string | null;
  outputPrice: string | null;
  slippage: string | null;
  priceImpact: string | null;
  isDca: boolean;
  isTakeProfit: boolean;
  transactionHash: string | null;
  protocolFeeSol: string | null;
  networkFeeSol: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Query parameters for listing agent transactions
 */
export interface ListAgentTransactionsQuery {
  agentId: string;
  walletAddress?: string;
  transactionType?: TransactionType;
  startTime?: string;
  endTime?: string;
  signalId?: string;
  isDca?: string;
  isTakeProfit?: string;
  limit?: string;
  offset?: string;
}
