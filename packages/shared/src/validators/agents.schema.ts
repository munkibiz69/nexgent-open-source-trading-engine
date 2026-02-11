import { z } from 'zod';

export const CreateAgentSchema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters').max(50, 'Name must be less than 50 characters'),
  tradingMode: z.enum(['simulation', 'live']).default('simulation'),
});

export const UpdateAgentSchema = z.object({
  name: z.string().min(3).max(50).optional(),
  tradingMode: z.enum(['simulation', 'live']).optional(),
  automatedTradingSimulation: z.boolean().optional(),
  automatedTradingLive: z.boolean().optional(),
});

export type CreateAgentInput = z.infer<typeof CreateAgentSchema>;
export type UpdateAgentInput = z.infer<typeof UpdateAgentSchema>;

