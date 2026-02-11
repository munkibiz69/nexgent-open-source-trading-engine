'use client';

/**
 * Assign Wallet Component
 * 
 * Displays a prompt when no wallet is assigned for live trading mode.
 * Provides a button to navigate to the wallet page to assign a wallet.
 * 
 * @module features/positions/components/assign-wallet
 */

import { useRouter } from 'next/navigation';
import { Wallet, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useAgentSelection } from '@/shared/contexts/agent-selection.context';

export interface AssignWalletProps {
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * Assign Wallet Component
 * 
 * Shows a prompt when no wallet is assigned for live trading mode.
 * 
 * @example
 * ```tsx
 * <AssignWallet />
 * ```
 */
export function AssignWallet({ className }: AssignWalletProps) {
  const router = useRouter();
  const { selectedAgentId } = useAgentSelection();

  const handleAssignClick = () => {
    if (selectedAgentId) {
      router.push(`/dashboard/wallet`);
    } else {
      router.push('/dashboard/wallet');
    }
  };

  return (
    <>
      <div className={`flex flex-col items-center justify-center py-12 px-4 ${className || ''}`}>
        {/* Wallet icon with visual indicator */}
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
            <Wallet className="w-8 h-8 text-muted-foreground" />
          </div>
          {/* Empty indicator */}
          <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          </div>
        </div>

        {/* Heading and description */}
        <div className="text-center mb-6">
          <h3 className="text-lg font-medium mb-2">No Wallet Assigned</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Your agent needs a live wallet to start trading. Assign a wallet from your environment variables to begin monitoring and executing trades.
          </p>
        </div>

        {/* Assign button */}
        <Button 
          onClick={handleAssignClick}
          className="bg-[#16B364] hover:bg-[#16B364]/90 text-white flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Assign Wallet
        </Button>
      </div>
    </>
  );
}

