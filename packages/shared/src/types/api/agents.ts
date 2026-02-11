/**
 * Agent API types
 * Shared between frontend and backend
 */

/**
 * Request body for creating an agent
 */
export interface CreateAgentRequest {
  name: string;
  tradingMode?: 'simulation' | 'live';
}

/**
 * Request body for updating an agent
 */
export interface UpdateAgentRequest {
  name?: string;
  tradingMode?: 'simulation' | 'live';
  automatedTradingSimulation?: boolean;
  automatedTradingLive?: boolean;
}

/**
 * Agent response object
 */
export interface AgentResponse {
  id: string;
  userId: string;
  name: string;
  tradingMode: 'simulation' | 'live';
  automatedTradingSimulation: boolean;
  automatedTradingLive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
