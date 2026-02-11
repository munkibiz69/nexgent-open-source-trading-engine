import { z } from 'zod';

/**
 * API Key scope enum
 * 
 * - signals: Trading signals (read + write)
 * - agents: Read agent data and configuration
 * - positions: Read open positions
 * - balances: Read agent balances
 * - transactions: Read transaction history
 * - history: Read historical swaps
 * - full_access: Full API access (grants all permissions)
 */
export const ApiKeyScopeEnum = z.enum([
  'signals',
  'agents',
  'positions',
  'balances',
  'transactions',
  'history',
  'full_access',
]);

/**
 * Schema for creating a new API key
 */
export const CreateApiKeySchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less'),
  scopes: z
    .array(ApiKeyScopeEnum)
    .min(1, 'At least one scope is required'),
});

export type CreateApiKeyInput = z.infer<typeof CreateApiKeySchema>;
export type ApiKeyScope = z.infer<typeof ApiKeyScopeEnum>;
