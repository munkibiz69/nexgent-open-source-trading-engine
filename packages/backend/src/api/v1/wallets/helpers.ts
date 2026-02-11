/**
 * Wallet helper functions
 * 
 * Utility functions for wallet-related operations.
 */

import { prisma } from '@/infrastructure/database/client.js';

/**
 * Get the default wallet for an agent based on their trading mode
 * 
 * @param agentId - The agent ID
 * @returns The wallet address for the agent's current trading mode, or null if no wallet exists
 */
export async function getDefaultWalletForAgent(agentId: string): Promise<string | null> {
  // Get agent's trading mode
  const agent = await prisma.agent.findUnique({
    where: { id: agentId },
    select: { tradingMode: true },
  });

  if (!agent) {
    return null;
  }

  // Find wallet matching the agent's trading mode
  const wallet = await prisma.agentWallet.findFirst({
    where: {
      agentId,
      walletType: agent.tradingMode,
    },
    select: { walletAddress: true },
  });

  return wallet?.walletAddress || null;
}

/**
 * Validate that a wallet belongs to an agent
 * 
 * @param walletAddress - The wallet address to validate
 * @param agentId - The agent ID to check against
 * @returns True if the wallet belongs to the agent, false otherwise
 */
export async function validateWalletBelongsToAgent(
  walletAddress: string,
  agentId: string
): Promise<boolean> {
  const wallet = await prisma.agentWallet.findFirst({
    where: {
      walletAddress: walletAddress,
      agentId,
    },
    select: { walletAddress: true },
  });

  return !!wallet;
}

