/**
 * Agent Trading Configuration API types
 * 
 * TypeScript types for trading configuration API requests and responses.
 */

import type { AgentTradingConfig } from '@nexgent/shared';

/**
 * Request body for updating trading configuration
 * 
 * Partial update - only provided fields will be merged with existing config.
 * Use null to reset a field to default.
 */
export interface UpdateTradingConfigRequest {
  config: Partial<AgentTradingConfig> | null;
}

/**
 * Trading configuration response
 * 
 * Always returns the complete, merged configuration (with defaults applied).
 */
export interface TradingConfigResponse {
  config: AgentTradingConfig;
}

