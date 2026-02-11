'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { apiClient } from '@/infrastructure/api/client/api-client';
import { useToast } from '@/shared/hooks/use-toast';

import type { WalletResetDialogProps } from '../../types/wallet.types';

export function WalletResetDialog({
  open,
  onOpenChange,
  agentId,
  walletAddress,
  walletType = 'simulation',
  onSuccess,
}: WalletResetDialogProps) {
  const { toast } = useToast();
  const [isResetting, setIsResetting] = useState(false);
  const isLive = walletType === 'live';

  const handleReset = async () => {
    setIsResetting(true);

    try {
      const response = await apiClient.request(
        `/api/v1/wallets/${walletAddress}/reset`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ confirm: true }),
        }
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to reset wallet' }));
        throw new Error(error.error || 'Failed to reset wallet');
      }

      toast({
        title: 'Wallet Reset',
        description: isLive
          ? 'Database records have been cleared. Transaction history and balances have been removed from the database.'
          : 'Simulation wallet has been reset successfully. All trading data has been cleared.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error resetting wallet:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to reset wallet',
        variant: 'destructive',
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleClose = () => {
    if (!isResetting) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isLive ? 'Reset Live Wallet Data' : 'Reset Simulation Wallet'}</DialogTitle>
          <DialogDescription>
            {isLive
              ? 'This will clear trading data stored in the database. Your actual wallet and its on-chain funds are not affected.'
              : 'Review the details below before resetting. This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Warning Information */}
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2">What will be deleted:</div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{isLive ? 'Transaction history' : 'All simulation trading history'}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{isLive ? 'Balance records (stored in database)' : 'All simulation open positions'}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{isLive ? 'Open position records' : 'All simulation token balances'}</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>{isLive ? 'Historical swap records' : 'All simulation transaction records'}</span>
                </li>
              </ul>
            </div>
            {isLive && (
              <p className="text-sm text-muted-foreground pt-2 border-t">
                Your wallet address and on-chain funds remain untouched. Only the database records used by this application will be cleared.
              </p>
            )}
          </div>

          {/* Warning Alert */}
          <Alert className="border-amber-500 bg-amber-500/10 text-amber-500">
            <AlertDescription>
              {isLive
                ? '⚠️ Database records will be permanently deleted. Your actual wallet and its funds are safe.'
                : '⚠️ This is a destructive operation. All trading data will be permanently deleted and cannot be recovered.'}
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isResetting}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleReset}
            disabled={isResetting}
          >
            {isResetting ? 'Resetting Wallet...' : 'Reset Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

