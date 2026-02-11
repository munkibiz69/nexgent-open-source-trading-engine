/**
 * Trading Configuration Form Schema
 * 
 * Zod schema for validating trading configuration form data.
 * Reuses validation schemas from the shared package.
 */

import { z } from 'zod';
import {
  purchaseLimitsSchema,
  signalConfigSchema,
  stopLossSchema,
  positionCalculatorSchema,
  staleTradeSchema,
  dcaSchema,
  takeProfitConfigSchema,
} from '@nexgent/shared';

/**
 * Complete trading configuration form schema
 * 
 * Note: DCA and Take-Profit are mutually exclusive.
 * The backend will auto-disable one when the other is enabled.
 */
export const agentTradingConfigSchema = z.object({
  purchaseLimits: purchaseLimitsSchema,
  signals: signalConfigSchema,
  stopLoss: stopLossSchema,
  positionCalculator: positionCalculatorSchema,
  staleTrade: staleTradeSchema,
  dca: dcaSchema,
  takeProfit: takeProfitConfigSchema,
});

/**
 * Type inference from schema
 */
export type AgentTradingConfigFormValues = z.infer<typeof agentTradingConfigSchema>;

