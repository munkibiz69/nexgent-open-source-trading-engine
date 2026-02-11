'use client';

import { memo, useCallback, useState } from 'react';
import { useTradingMode } from '@/shared/contexts/trading-mode.context';
import { useUpdateAgent } from '@/features/agents';
import { useToast } from '@/shared/hooks/use-toast';
import { emitAgentUpdated } from '@/shared/constants';
import { Hammer, Radio, Loader2 } from 'lucide-react';
import { TradingModeSwitchDialog } from './trading-mode-switch-dialog';

/**
 * Trading mode toggle component
 * 
 * Displays both trading mode options (simulation/live) and allows toggling between them.
 * Shows confirmation dialog before switching, which explains that automated trading
 * will be paused in the current mode to focus resources on the new mode.
 */
function TradingModeToggleComponent() {
  const { tradingMode, isLiveTrading, isLoading, hasAgent, agentId } = useTradingMode();
  const updateAgentMutation = useUpdateAgent();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [targetMode, setTargetMode] = useState<'simulation' | 'live' | null>(null);

  const handleToggleClick = useCallback((mode: 'simulation' | 'live') => {
    if (!agentId || !hasAgent || isLoading || updateAgentMutation.isPending || tradingMode === mode) {
      return;
    }
    // Open confirmation dialog
    setTargetMode(mode);
    setIsDialogOpen(true);
  }, [agentId, hasAgent, isLoading, updateAgentMutation.isPending, tradingMode]);

  const handleConfirm = useCallback(async () => {
    if (!agentId || !targetMode || !tradingMode) {
      return;
    }

    try {
      // When switching modes:
      // 1. Update trading mode to the new mode
      // 2. Pause automated trading in the OLD (current) mode
      const updateData = tradingMode === 'live'
        ? { tradingMode: targetMode, automatedTradingLive: false }
        : { tradingMode: targetMode, automatedTradingSimulation: false };

      await updateAgentMutation.mutateAsync({
        agentId,
        data: updateData,
      });
      
      // Emit event to notify other components
      emitAgentUpdated();
      
      toast({
        title: 'Trading mode updated',
        description: `Switched to ${targetMode === 'live' ? 'live' : 'simulation'} trading. Automated trading paused in ${tradingMode} mode.`,
      });
      
      setIsDialogOpen(false);
      setTargetMode(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update trading mode. Please try again.',
        variant: 'destructive',
      });
    }
  }, [agentId, targetMode, tradingMode, updateAgentMutation, toast]);

  const isDisabled = !hasAgent || isLoading || updateAgentMutation.isPending;

  // Show loading state while fetching agent data
  if (isLoading) {
    return (
      <div className="flex items-center gap-1 bg-muted p-1 rounded-md">
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show disabled state when no agent is selected
  if (!hasAgent) {
    return (
      <div className="flex items-center gap-1 bg-muted p-1 rounded-md opacity-50">
        <span className="px-2 py-1 text-xs font-medium text-muted-foreground">
          No agent selected
        </span>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-1 bg-muted p-1 rounded-md w-full md:w-auto">
        <button
          onClick={() => handleToggleClick('simulation')}
          disabled={isDisabled}
          className={`flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors flex-1 md:flex-none ${
            !isLiveTrading
              ? 'bg-background shadow-sm text-orange-600 dark:text-orange-400'
              : 'text-muted-foreground hover:text-foreground'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Simulation trading mode"
          aria-pressed={!isLiveTrading}
        >
          <Hammer 
            className={`h-3 w-3 ${
              !isLiveTrading 
                ? 'text-orange-600 dark:text-orange-400' 
                : 'text-muted-foreground'
            }`} 
            aria-hidden="true" 
          />
          <span className="hidden sm:inline">Simulation trading</span>
          <span className="sm:hidden">Simulation</span>
        </button>
        <button
          onClick={() => handleToggleClick('live')}
          disabled={isDisabled}
          className={`flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors flex-1 md:flex-none ${
            isLiveTrading
              ? 'bg-background shadow-sm text-green-600 dark:text-green-400'
              : 'text-muted-foreground hover:text-foreground'
          } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          aria-label="Live trading mode"
          aria-pressed={isLiveTrading}
        >
          <Radio 
            className={`h-3 w-3 ${
              isLiveTrading 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-muted-foreground'
            }`} 
            aria-hidden="true" 
          />
          <span className="hidden sm:inline">Live trading</span>
          <span className="sm:hidden">Live</span>
        </button>
      </div>

      {tradingMode && targetMode && (
        <TradingModeSwitchDialog
          isOpen={isDialogOpen}
          onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) setTargetMode(null);
          }}
          currentMode={tradingMode}
          targetMode={targetMode}
          onConfirm={handleConfirm}
          isPending={updateAgentMutation.isPending}
        />
      )}
    </>
  );
}

// Memoize component to prevent unnecessary re-renders
export const TradingModeToggle = memo(TradingModeToggleComponent);
