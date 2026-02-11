/**
 * WebSocket Types
 * 
 * Type definitions for WebSocket messages and connection management.
 * 
 * @module infrastructure/websocket/types
 */

import type { OpenPosition } from '@nexgent/shared';

/**
 * Base WebSocket message structure
 */
export interface WSMessage {
  type: string;
  data?: unknown;
  timestamp?: string;
}

/**
 * Enriched position data sent from backend (includes calculated fields)
 */
export interface EnrichedPosition extends OpenPosition {
  currentPrice?: number;
  currentPriceUsd?: number;
  purchasePriceUsd?: number;
  priceChangePercent?: number;
  positionValueUsd?: number;
  positionValueSol?: number;
  profitLossUsd?: number;
  profitLossSol?: number;
  profitLossPercent?: number;
}

/**
 * Initial data message - sent when connection is established
 */
export interface InitialDataMessage extends WSMessage {
  type: 'initial_data';
  data: {
    positions: EnrichedPosition[];
    timestamp: string;
  };
}

/**
 * Position update message - sent when a position changes
 */
export interface PositionUpdateMessage extends WSMessage {
  type: 'position_update';
  data: {
    eventType: 'position_created' | 'position_updated' | 'position_closed';
    position?: OpenPosition;
    positionId?: string;
  };
}

/**
 * Price update message - sent when a token price changes
 */
export interface PriceUpdateMessage extends WSMessage {
  type: 'price_update';
  data: {
    tokenAddress: string;
    price: number;        // SOL price
    priceUsd: number;     // USD price
    timestamp: string;
  };
}

/**
 * Batch price update message - sent when multiple token prices change
 */
export interface PriceUpdateBatchMessage extends WSMessage {
  type: 'price_update_batch';
  data: {
    updates: Array<{
      tokenAddress: string;
      price: number;        // SOL price
      priceUsd: number;     // USD price
    }>;
    timestamp: string;
  };
}

/**
 * Connection confirmation message
 */
export interface ConnectedMessage extends WSMessage {
  type: 'connected';
  data: {
    agentId: string;
    timestamp: string;
  };
}

/**
 * Error message from WebSocket
 */
export interface ErrorMessage extends WSMessage {
  type: 'error';
  data: {
    message: string;
  };
}

/**
 * Union type of all WebSocket message types
 */
export type WebSocketMessage =
  | InitialDataMessage
  | PositionUpdateMessage
  | PriceUpdateMessage
  | PriceUpdateBatchMessage
  | ConnectedMessage
  | ErrorMessage;

/**
 * WebSocket hook options
 */
export interface UseWebSocketOptions {
  /**
   * Whether to automatically connect when the hook mounts
   * @default true
   */
  autoConnect?: boolean;
  /**
   * Reconnection interval in milliseconds
   * @default 3000
   */
  reconnectInterval?: number;
  /**
   * Maximum number of reconnection attempts
   * @default 10
   */
  maxReconnectAttempts?: number;
  /**
   * Ping interval in milliseconds to keep connection alive
   * @default 30000
   */
  pingInterval?: number;
}

/**
 * WebSocket hook return type
 */
export interface UseWebSocketReturn {
  // Connection state
  /** Whether the WebSocket is currently connected */
  isConnected: boolean;
  /** Whether the WebSocket is currently connecting */
  isConnecting: boolean;
  /** Connection error message, if any */
  connectionError: string | null;
  /** Number of reconnection attempts made */
  reconnectAttempts: number;

  // Data
  /** Current live positions */
  positions: LivePosition[];
  /** Timestamp of last update */
  lastUpdateTime: Date | null;
  /** Total number of messages received */
  messageCount: number;

  // Methods
  /** Connect to WebSocket */
  connect: () => void;
  /** Disconnect from WebSocket */
  disconnect: () => void;
  /** Manually trigger reconnection */
  reconnect: () => void;
}

/**
 * Live position with enriched price data
 * 
 * @deprecated This type is maintained for backward compatibility.
 * Please use LivePosition from '@/features/agents' instead.
 */
export interface LivePosition extends OpenPosition {
  currentPrice?: number;           // Current price in SOL (from price updates)
  currentPriceUsd?: number;        // Current price in USD
  purchasePriceUsd?: number;       // Purchase price in USD (for accurate P/L calculation)
  priceChangePercent?: number;     // Price change from entry
  positionValueUsd?: number;       // Current position value in USD
  positionValueSol?: number;       // Current position value in SOL
  profitLossUsd?: number;          // Profit/loss in USD
  profitLossSol?: number;          // Profit/loss in SOL
  profitLossPercent?: number;      // Profit/loss percentage
}

