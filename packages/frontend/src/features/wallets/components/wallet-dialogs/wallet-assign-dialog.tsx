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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Label } from '@/shared/components/ui/label';
import { Loader2, Wallet } from 'lucide-react';
import { useWallet } from '@/shared/contexts/wallet.context';
import { useToast } from '@/shared/hooks/use-toast';
import type { WalletAssignDialogProps } from '../../types/wallet.types';

export function WalletAssignDialog({
  open,
  onOpenChange,
  agentId,
  onSuccess,
}: WalletAssignDialogProps) {
  const { availableWallets, assignWallet, isLoading } = useWallet();
  const { toast } = useToast();
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string>('');
  const [isAssigning, setIsAssigning] = useState(false);

  // Filter out wallets that are already assigned
  const unassignedWallets = availableWallets.filter((w) => !w.isAssigned);

  const handleAssign = async () => {
    if (!selectedWalletAddress) {
      toast({
        title: 'Error',
        description: 'Please select a wallet',
        variant: 'destructive',
      });
      return;
    }

    setIsAssigning(true);

    try {
      await assignWallet(agentId, selectedWalletAddress, 'live');
      setSelectedWalletAddress('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error assigning wallet:', error);
      // Error toast is handled by the context
    } finally {
      setIsAssigning(false);
    }
  };

  const handleClose = () => {
    if (!isAssigning) {
      setSelectedWalletAddress('');
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Assign Wallet to Agent
          </DialogTitle>
          <DialogDescription>
            Select a wallet from your environment variables to assign to this agent for live trading.
            Simulation wallets are automatically created and cannot be assigned.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {unassignedWallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-2">
                No available wallets found.
              </p>
              <p className="text-xs text-muted-foreground">
                Configure wallets via environment variables (WALLET_1, WALLET_2, etc.) and restart the server.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="wallet-select">Available Wallet</Label>
              <Select
                value={selectedWalletAddress}
                onValueChange={setSelectedWalletAddress}
                disabled={isAssigning || isLoading}
              >
                <SelectTrigger id="wallet-select">
                  <SelectValue placeholder="Select a wallet address" />
                </SelectTrigger>
                <SelectContent>
                  {unassignedWallets.map((wallet) => (
                    <SelectItem key={wallet.walletAddress} value={wallet.walletAddress}>
                      <div className="flex flex-col">
                        <span className="font-mono text-sm">{wallet.walletAddress}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Only wallets loaded from environment variables are available for assignment.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isAssigning}
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedWalletAddress || isAssigning || isLoading || unassignedWallets.length === 0}
          >
            {isAssigning ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Wallet'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

