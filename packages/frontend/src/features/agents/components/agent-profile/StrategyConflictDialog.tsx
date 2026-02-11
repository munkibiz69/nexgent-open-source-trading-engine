'use client';

/**
 * Strategy Conflict Dialog
 * 
 * Shows confirmation when trying to enable DCA while Take-Profit is active (or vice versa).
 * These strategies are mutually exclusive in the current implementation.
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
import { TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';

export type StrategyType = 'dca' | 'takeProfit';

interface StrategyConflictDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  enablingStrategy: StrategyType;
  onConfirm: () => void;
}

const strategyLabels: Record<StrategyType, string> = {
  dca: 'Dollar Cost Averaging (DCA)',
  takeProfit: 'Take-Profit',
};

const strategyShortLabels: Record<StrategyType, string> = {
  dca: 'DCA',
  takeProfit: 'Take-Profit',
};

const strategyIcons: Record<StrategyType, React.ReactNode> = {
  dca: <TrendingDown className="h-4 w-4" />,
  takeProfit: <TrendingUp className="h-4 w-4" />,
};

export function StrategyConflictDialog({
  isOpen,
  onOpenChange,
  enablingStrategy,
  onConfirm,
}: StrategyConflictDialogProps) {
  const disablingStrategy: StrategyType = enablingStrategy === 'dca' ? 'takeProfit' : 'dca';
  
  const enablingLabel = strategyLabels[enablingStrategy];
  const disablingLabel = strategyLabels[disablingStrategy];
  const enablingShort = strategyShortLabels[enablingStrategy];
  const disablingShort = strategyShortLabels[disablingStrategy];

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Enable {enablingShort}?
          </DialogTitle>
          <DialogDescription>
            {enablingLabel} and {disablingLabel} cannot both be enabled at the same time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Visual representation of the switch */}
          <div className="flex items-center justify-center gap-3 p-4 bg-muted/30 border rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              {strategyIcons[disablingStrategy]}
              <span className="text-sm">{disablingShort}</span>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="flex items-center gap-2 text-primary font-medium">
              {strategyIcons[enablingStrategy]}
              <span className="text-sm">{enablingShort}</span>
            </div>
          </div>

          {/* Explanation */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-2">
            <div className="text-sm font-medium">What will happen:</div>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• <strong>{enablingShort}</strong> will be enabled</li>
              <li>• <strong>{disablingShort}</strong> will be automatically disabled</li>
            </ul>
          </div>

          {/* Info Alert */}
          <Alert className="border-amber-500 bg-amber-500/10 text-amber-500">
            <AlertDescription>
              💡 You can run DCA or Take-Profit, but not both at the same time. Supporting both together introduces complex edge cases, so we&apos;ve kept the strategy model simple for now.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
          >
            Enable {enablingShort}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
