import { z } from 'zod';

/**
 * Schema for assigning a wallet to an agent
 */
export const AssignWalletSchema = z.object({
  agentId: z.string().uuid('Invalid Agent ID'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  walletType: z.enum(['simulation', 'live']),
});

export type AssignWalletInput = z.infer<typeof AssignWalletSchema>;
