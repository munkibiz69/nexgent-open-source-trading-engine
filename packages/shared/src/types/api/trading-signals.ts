/**
 * Trading Signal API types
 * Shared between frontend and backend
 */

/**
 * Request body for creating a trading signal
 */
export interface CreateTradingSignalRequest {
  tokenAddress: string;
  symbol?: string;
  signalType: string; // 'BUY' | 'SELL'
  activationReason?: string;
  signalStrength: number; // 1-5
  source?: string;
}

/**
 * Request body for updating a trading signal
 */
export interface UpdateTradingSignalRequest {
  tokenAddress?: string;
  symbol?: string | null;
  signalType?: string;
  activationReason?: string | null;
  signalStrength?: number;
  source?: string | null;
}

/**
 * Trading signal response
 */
export interface TradingSignalResponse {
  id: number;
  createdAt: Date;
  updatedAt: Date;
  tokenAddress: string;
  symbol: string | null;
  signalType: string;
  activationReason: string | null;
  signalStrength: number;
  source: string | null;
}

/**
 * Query parameters for listing trading signals
 */
export interface ListTradingSignalsQuery {
  tokenAddress?: string;
  signalType?: string;
  startDate?: string;
  endDate?: string;
  limit?: string;
  offset?: string;
}

/**
 * Query parameters for exporting trading signals to CSV
 * Reuses all filters from ListTradingSignalsQuery but excludes pagination
 */
export interface ExportTradingSignalsQuery {
  tokenAddress?: string;
  signalType?: string;
  startDate?: string;
  endDate?: string;
  /** User's timezone for date formatting (e.g., "America/New_York") */
  timezone?: string;
}

