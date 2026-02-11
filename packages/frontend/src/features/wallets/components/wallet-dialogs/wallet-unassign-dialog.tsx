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
import { unassignWallet } from '@/infrastructure/api/services/wallets.service';
import { useToast } from '@/shared/hooks/use-toast';

import type { WalletUnassignDialogProps } from '../../types/wallet.types';

export function WalletUnassignDialog({
  open,
  onOpenChange,
  agentId,
  walletAddress,
  onSuccess,
}: WalletUnassignDialogProps) {
  const { toast } = useToast();
  const [isUnassigning, setIsUnassigning] = useState(false);

  const handleUnassign = async () => {
    setIsUnassigning(true);

    try {
      await unassignWallet(walletAddress);

      toast({
        title: 'Wallet Unassigned',
        description: 'The wallet has been unassigned and all transaction history cleared from the database. You can now assign a new wallet.',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error unassigning wallet:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to unassign wallet',
        variant: 'destructive',
      });
    } finally {
      setIsUnassigning(false);
    }
  };

  const handleClose = () => {
    if (!isUnassigning) {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Unassign Live Wallet</DialogTitle>
          <DialogDescription>
            This will clear all transaction history from the database and remove the wallet assignment. You will be able to assign a different wallet to this agent.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 bg-muted/30 border rounded-lg space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-2">What will happen:</div>
              <ul className="space-y-1 text-sm">
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>All transaction history will be cleared from the database</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>Balance and position records will be removed</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>The wallet will be unassigned from this agent</span>
                </li>
                <li className="flex items-start">
                  <span className="mr-2">•</span>
                  <span>You can then assign a new wallet from your environment</span>
                </li>
              </ul>
            </div>
            <p className="text-sm text-muted-foreground pt-2 border-t">
              Your actual wallet and its on-chain funds are not affected. Only the database records used by this application will be cleared.
            </p>
          </div>

          <Alert className="border-amber-500 bg-amber-500/10 text-amber-500">
            <AlertDescription>
              ⚠️ This action cannot be undone. Database records will be permanently deleted. Your wallet and funds remain safe.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isUnassigning}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={handleUnassign}
            disabled={isUnassigning}
          >
            {isUnassigning ? 'Unassigning...' : 'Unassign Wallet'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
