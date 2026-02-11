'use client';

/**
 * Insufficient Balance Component
 * 
 * Displays a prompt when the agent has insufficient balance (< 0.5 SOL)
 * to start trading. Provides a button to navigate to wallet deposit.
 * 
 * @module features/positions/components/insufficient-balance
 */

import { useRouter } from 'next/navigation';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAgentBalances } from '@/features/agents';
import { useAgentSelection } from '@/shared/contexts/agent-selection.context';
import { useTradingMode } from '@/shared/contexts/trading-mode.context';

// SOL mint address constant
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';
const MINIMUM_BALANCE_SOL = 0.5;

export interface InsufficientBalanceProps {
  /**
   * Optional agent ID. If not provided, uses selected agent from context.
   */
  agentId?: string;
  /**
   * Optional wallet address. If not provided, checks all wallets.
   * Should be provided to filter by current trading mode's wallet.
   */
  walletAddress?: string;
}

/**
 * Insufficient Balance Component
 * 
 * Shows a prompt when agent balance is below the minimum required (0.5 SOL).
 * 
 * @example
 * ```tsx
 * <InsufficientBalance />
 * <InsufficientBalance agentId="agent-123" />
 * ```
 */
export function InsufficientBalance({ agentId, walletAddress }: InsufficientBalanceProps) {
  const router = useRouter();
  const { selectedAgentId } = useAgentSelection();
  const { tradingMode } = useTradingMode();
  const effectiveAgentId = agentId || selectedAgentId;

  // Fetch agent balances - filter by walletAddress if provided (for trading mode filtering)
  const { data: balances = [], isLoading } = useAgentBalances(
    effectiveAgentId || undefined,
    walletAddress,
    !!effectiveAgentId
  );

  // Get SOL balance
  const solBalance = balances.find((b) => b.tokenAddress === SOL_MINT_ADDRESS);
  const balanceValue = solBalance ? parseFloat(solBalance.balance) : 0;

  // Don't show if loading or if balance is sufficient
  if (isLoading || balanceValue >= MINIMUM_BALANCE_SOL) {
    return null;
  }

  // Determine if we're in simulation mode (default to simulation if mode is not available)
  const isSimulation = tradingMode === 'simulation' || tradingMode === null;
  const solLabel = isSimulation ? 'Virtual SOL' : 'SOL';

  const handleDepositClick = () => {
    if (effectiveAgentId) {
      router.push(`/dashboard/wallet`);
    } else {
      router.push('/dashboard/wallet');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      {/* Wallet icon with visual indicator */}
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <Wallet className="w-8 h-8 text-muted-foreground" />
        </div>
        {/* Empty indicator */}
        <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
        </div>
      </div>

      {/* Heading and description */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-medium mb-2">Insufficient Balance</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Your agent needs at least {MINIMUM_BALANCE_SOL} SOL to start trading. Deposit {solLabel.toLowerCase()} to begin monitoring and executing trades based on your risk profile.
        </p>
      </div>

      {/* Deposit button */}
      <Button 
        onClick={handleDepositClick}
        className="bg-[#16B364] hover:bg-[#16B364]/90 text-white flex items-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Deposit {solLabel}
      </Button>
    </div>
  );
}

