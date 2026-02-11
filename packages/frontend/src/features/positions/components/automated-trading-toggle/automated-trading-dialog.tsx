'use client';

/**
 * Automated Trading Confirmation Dialog
 * 
 * Shows warning about what will be paused/resumed when toggling automated trading.
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

interface AutomatedTradingDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'pause' | 'resume' | null;
  onConfirm: () => void;
  isPending: boolean;
  tradingMode?: 'simulation' | 'live';
}

export function AutomatedTradingDialog({
  isOpen,
  onOpenChange,
  action,
  onConfirm,
  isPending,
  tradingMode = 'simulation',
}: AutomatedTradingDialogProps) {
  const isPausing = action === 'pause';
  const modeLabel = tradingMode === 'live' ? 'Live' : 'Simulation';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isPausing ? 'Pause Automated Trading?' : 'Resume Automated Trading?'}
            <Badge 
              variant="secondary"
              className={tradingMode === 'live' ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
            >
              {modeLabel}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            {isPausing
              ? `This will temporarily disable automated trading operations for ${modeLabel.toLowerCase()} mode.`
              : `This will re-enable automated trading operations for ${modeLabel.toLowerCase()} mode.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">
                {isPausing ? 'What will be disabled:' : 'What will be enabled:'}
              </div>
              <ul className="text-sm space-y-1">
                <li>• Automatic purchases from trading signals</li>
                <li>• Stop loss execution</li>
                <li>• Trailing stop loss updates</li>
                <li>• Stale trade auto-close</li>
                <li>• DCA (automatic re-buys on dips)</li>
              </ul>
            </div>

            {isPausing && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">What will still work:</div>
                <ul className="text-sm space-y-1">
                  <li>• Manual position closing</li>
                  <li>• Viewing positions and live prices</li>
                  <li>• Trading in {tradingMode === 'live' ? 'simulation' : 'live'} mode</li>
                </ul>
              </div>
            )}
          </div>

          {/* Warning Message */}
          {isPausing && (
            <Alert className="border-amber-500 bg-amber-500/10 text-amber-500">
              <AlertDescription>
                ⚠️ Stop losses will not execute while paused. Monitor your positions manually.
              </AlertDescription>
            </Alert>
          )}
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
            variant={isPausing ? 'destructive' : 'default'}
            onClick={onConfirm}
            disabled={isPending}
          >
            {isPending
              ? 'Updating...'
              : isPausing
              ? 'Pause Trading'
              : 'Resume Trading'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
