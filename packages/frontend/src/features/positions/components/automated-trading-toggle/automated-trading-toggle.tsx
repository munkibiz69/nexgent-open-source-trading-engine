'use client';

/**
 * Automated Trading Toggle Component
 * 
 * Button to pause/resume automated trading for the selected agent.
 * Shows confirmation dialog before toggling.
 * 
 * Note: The pause/resume is mode-specific - pausing in simulation mode
 * only affects simulation trading, not live trading (and vice versa).
 */

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Pause, Play, Loader2 } from 'lucide-react';
import { useAgent, useUpdateAgent } from '@/features/agents';
import { useToast } from '@/shared/hooks/use-toast';
import { AutomatedTradingDialog } from './automated-trading-dialog';
import { useAgentSelection } from '@/shared/contexts/agent-selection.context';
import { useTradingMode } from '@/shared/contexts/trading-mode.context';

export function AutomatedTradingToggle() {
  const { selectedAgentId } = useAgentSelection();
  const { tradingMode, isLoading: isLoadingMode } = useTradingMode();
  const { data: agent, isLoading: isLoadingAgent } = useAgent(selectedAgentId || undefined);
  const updateAgentMutation = useUpdateAgent();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<'pause' | 'resume' | null>(null);

  const handleToggle = (action: 'pause' | 'resume') => {
    setPendingAction(action);
    setIsDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!agent || !selectedAgentId || !tradingMode) return;

    const newValue = pendingAction === 'resume';

    // Update the correct field based on current trading mode
    const updateData = tradingMode === 'live' 
      ? { automatedTradingLive: newValue }
      : { automatedTradingSimulation: newValue };

    try {
      await updateAgentMutation.mutateAsync({
        agentId: selectedAgentId,
        data: updateData,
      });

      toast({
        title: 'Automated trading updated',
        description: `Automated trading ${pendingAction === 'pause' ? 'paused' : 'resumed'} for ${tradingMode} mode`,
      });

      setIsDialogOpen(false);
      setPendingAction(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update automated trading. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Don't render until we have all data
  if (!agent || isLoadingAgent || isLoadingMode || !tradingMode) {
    return null;
  }

  // Get the automated trading status for the current trading mode
  const isPaused = tradingMode === 'live' 
    ? !agent.automatedTradingLive 
    : !agent.automatedTradingSimulation;

  return (
    <>
      <Button
        variant={isPaused ? 'default' : 'outline'}
        size="sm"
        className="w-full md:w-auto relative"
        onClick={() => handleToggle(isPaused ? 'resume' : 'pause')}
        disabled={updateAgentMutation.isPending}
      >
        {updateAgentMutation.isPending ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Updating...
          </>
        ) : (
          <>
            {/* Status indicator light with pulse animation */}
            <span
              className={`h-2.5 w-2.5 rounded-full mr-2 ${
                isPaused 
                  ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)] animate-pulse' 
                  : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.9)] animate-pulse'
              }`}
              aria-hidden="true"
            />
            {isPaused ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Resume Trading
              </>
            ) : (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Pause Trading
              </>
            )}
          </>
        )}
      </Button>

      <AutomatedTradingDialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        action={pendingAction}
        onConfirm={handleConfirm}
        isPending={updateAgentMutation.isPending}
        tradingMode={tradingMode}
      />
    </>
  );
}
