'use client';

/**
 * Trading Mode Switch Confirmation Dialog
 * 
 * Shows warning when switching between simulation and live trading modes.
 * Informs user that automated trading will be paused in the current mode
 * to focus resources on the new mode.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Badge } from '@/shared/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface TradingModeSwitchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  currentMode: 'simulation' | 'live';
  targetMode: 'simulation' | 'live';
  onConfirm: () => void;
  isPending: boolean;
}

export function TradingModeSwitchDialog({
  isOpen,
  onOpenChange,
  currentMode,
  targetMode,
  onConfirm,
  isPending,
}: TradingModeSwitchDialogProps) {
  const currentModeLabel = currentMode === 'live' ? 'Live' : 'Simulation';
  const targetModeLabel = targetMode === 'live' ? 'Live' : 'Simulation';
  const isGoingLive = targetMode === 'live';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            Switch to {targetModeLabel} Trading?
            <div className="flex items-center gap-1">
              <Badge 
                variant="secondary"
                className={currentMode === 'live' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
              >
                {currentModeLabel}
              </Badge>
              <ArrowRight className="h-3 w-3 text-muted-foreground" />
              <Badge 
                variant="secondary"
                className={targetMode === 'live' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
              >
                {targetModeLabel}
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            {isGoingLive
              ? 'Your agent will begin trading with real funds on the Solana network.'
              : 'Your agent will trade in a simulated environment using test transactions.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">What happens when you switch:</div>
              <ul className="text-sm space-y-1">
                <li>• <strong>{targetModeLabel}</strong> mode becomes active</li>
                <li>• Automated trading in <strong>{currentModeLabel}</strong> mode will be paused</li>
                <li>• All agent resources will focus on {targetModeLabel.toLowerCase()} trading</li>
              </ul>
            </div>

            {isGoingLive && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">Why we do this:</div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Prevents API rate limits from affecting critical trades</li>
                  <li>• Ensures optimal execution speed for your active mode</li>
                  <li>• You can re-enable {currentModeLabel.toLowerCase()} trading anytime</li>
                </ul>
              </div>
            )}
          </div>

          {/* Warning/Info Alert */}
          <Alert className={isGoingLive 
            ? 'border-amber-500/20 bg-amber-500/10' 
            : 'border-green-500/20 bg-green-500/10'
          }>
            <AlertDescription className={isGoingLive ? 'text-amber-600' : 'text-green-600'}>
              {isGoingLive
                ? '⚠️ Live mode uses real SOL. Ensure you understand the risks before proceeding.'
                : '💡 Simulation mode is perfect for testing strategies without financial risk.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            variant={isGoingLive ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? 'Switching...'
              : `Switch to ${targetModeLabel}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

