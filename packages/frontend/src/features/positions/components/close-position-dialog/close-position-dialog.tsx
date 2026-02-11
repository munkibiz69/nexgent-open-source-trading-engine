'use client';

/**
 * Close Position Dialog Component
 * 
 * Confirmation dialog for closing a position.
 * Displays position details and allows user to confirm or cancel.
 */

import { useEffect, useState } from 'react';
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
import { useCurrency } from '@/shared/contexts/currency.context';
import { formatPrice, formatCurrency, abbreviateAddress } from '@/shared/utils/formatting';
import type { LivePosition } from '@/features/agents';
import type { ClosePositionDialogProps } from '../../types/position.types';

export function ClosePositionDialog({
  position,
  isOpen,
  onOpenChange,
  onConfirm,
  isClosing,
}: ClosePositionDialogProps) {
  const { currencyPreference, solPrice } = useCurrency();
  const [currentPosition, setCurrentPosition] = useState<LivePosition | null>(position);

  // Update current position when position prop changes (for real-time price updates)
  useEffect(() => {
    if (position) {
      setCurrentPosition(position);
    }
  }, [position]);

  if (!currentPosition) {
    return null;
  }

  // Calculate display values
  const purchasePrice = currencyPreference === 'USD'
    ? (currentPosition.purchasePrice * solPrice)
    : currentPosition.purchasePrice;

  const currentPrice = currencyPreference === 'USD'
    ? (currentPosition.currentPriceUsd ?? currentPosition.purchasePrice * solPrice)
    : (currentPosition.currentPrice ?? currentPosition.purchasePrice);

  const profitLoss = currencyPreference === 'USD'
    ? (currentPosition.profitLossUsd ?? 0)
    : (currentPosition.profitLossSol ?? 0);

  const changePercent = currentPosition.priceChangePercent ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !isClosing) {
        onOpenChange(false);
      }
    }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Close Position</DialogTitle>
          <DialogDescription>
            Review the current position details before closing. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Position Overview */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Token</div>
                <div className="font-medium">{currentPosition.tokenSymbol}</div>
                <div className="text-xs text-muted-foreground font-mono">
                  {abbreviateAddress(currentPosition.tokenAddress)}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Amount</div>
                <div className="font-medium">
                  {currentPosition.purchaseAmount.toLocaleString(undefined, { 
                    minimumFractionDigits: 2, 
                    maximumFractionDigits: 2 
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Purchase Price ({currencyPreference})</div>
                <div className="font-mono text-sm">
                  {formatPrice(purchasePrice, currencyPreference === 'USD')}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Current Price ({currencyPreference})</div>
                <div className="font-mono text-sm">
                  {formatPrice(currentPrice, currencyPreference === 'USD')}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Profit / Loss ({currencyPreference})</div>
                <div className={`font-medium ${profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(profitLoss, currencyPreference, solPrice, { showSign: true })}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Change (%)</div>
                <div className={`font-medium ${changePercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {`${changePercent >= 0 ? '+' : ''}${changePercent.toFixed(2)}%`}
                </div>
              </div>
            </div>
          </div>

          {/* Warning Message */}
          <Alert className="border-amber-500 bg-amber-500/10 text-amber-500">
            <AlertDescription>
              ⚠️ Market order: Shown price is indicative; final fill can change with slippage and timing.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isClosing}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isClosing}
          >
            {isClosing ? 'Closing Position...' : 'Close Position'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

