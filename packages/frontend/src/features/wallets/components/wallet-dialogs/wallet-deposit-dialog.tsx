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
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Loader2, Copy, CheckCircle2 } from 'lucide-react';
import { createAgentTransaction } from '@/infrastructure/api/services/agent-transactions.service';
import { checkForDeposits } from '@/infrastructure/api/services/wallets.service';
import { useToast } from '@/shared/hooks/use-toast';

const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

import type { WalletDepositDialogProps } from '../../types/wallet.types';

export function WalletDepositDialog({
  open,
  onOpenChange,
  agentId,
  currentBalance,
  solPrice,
  walletType = 'simulation',
  walletAddress,
  onSuccess,
}: WalletDepositDialogProps) {
  const { toast } = useToast();
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isLiveWallet = walletType === 'live';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || parseFloat(amount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const tokenQuantity = parseFloat(amount);
      const transactionAmount = tokenQuantity * solPrice;

      await createAgentTransaction({
        agentId,
        transactionType: 'DEPOSIT',
        transactionValueUsd: transactionAmount,
        transactionTime: new Date().toISOString(),
        inputMint: SOL_MINT_ADDRESS,
        inputSymbol: 'SOL',
        inputAmount: tokenQuantity.toString(),
        inputPrice: solPrice.toString(),
      });

      toast({
        title: 'Success',
        description: 'Funds deposited successfully',
      });

      setAmount('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error depositing funds:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to deposit funds',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setAmount('');
      onOpenChange(false);
    }
  };

  const handleCopyAddress = () => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      toast({
        title: 'Copied',
        description: 'Wallet address copied to clipboard',
      });
    }
  };

  const handleCheckDeposits = async () => {
    if (!walletAddress) {
      toast({
        title: 'Error',
        description: 'Wallet address not available',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await checkForDeposits(walletAddress, agentId);

      if (result.depositDetected) {
        toast({
          title: 'Deposit detected!',
          description: `${result.depositAmount?.toFixed(4)} SOL has been added to your balance.`,
        });
        onOpenChange(false);
        onSuccess?.(); // Trigger balance refresh
      } else {
        toast({
          title: 'No new deposits',
          description: result.message || 'Your balance is up to date with the on-chain balance.',
        });
      }
    } catch (error) {
      console.error('Error checking deposits:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to check for deposits',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const usdEquivalent = amount && !isNaN(parseFloat(amount))
    ? (parseFloat(amount) * solPrice).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : '0.00';

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogDescription>
            {isLiveWallet
              ? 'Send SOL to your wallet address. After sending, check for deposits to update your balance.'
              : 'Add SOL to your agent\'s wallet for testing different position sizes.'}
          </DialogDescription>
        </DialogHeader>
        {isLiveWallet ? (
          <div className="space-y-4 py-4">
            {walletAddress ? (
              <>
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono bg-muted p-2 rounded truncate">
                      {walletAddress}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyAddress}
                      className="shrink-0"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="rounded-lg border p-4 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-2">Instructions:</div>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                    <li>Copy your wallet address above</li>
                    <li>Send SOL from your external wallet (Phantom, Solflare, etc.) to this address</li>
                    <li>Wait for the transaction to confirm on the Solana network</li>
                    <li>Click &quot;Check for deposits&quot; to update your balance</li>
                  </ol>
                </div>
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
                  <div className="text-lg font-semibold">
                    {currentBalance.toFixed(4)} SOL
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    ≈ ${(currentBalance * solPrice).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Wallet address not available
              </div>
            )}
          </div>
          ) : (
          <form id="deposit-form" onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="deposit-amount">Amount (SOL)</Label>
                <Input
                  id="deposit-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div className="rounded-lg border p-3 bg-muted/30">
                <div className="text-sm text-muted-foreground mb-1">Current Balance</div>
                <div className="text-lg font-semibold">
                  {currentBalance.toFixed(2)} SOL
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  ≈ ${(currentBalance * solPrice).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              {amount && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0 && (
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-sm text-muted-foreground mb-1">Deposit Amount</div>
                  <div className="text-lg font-semibold">{parseFloat(amount).toFixed(2)} SOL</div>
                  <div className="text-sm text-muted-foreground mt-2">
                    ≈ ${usdEquivalent}
                  </div>
                </div>
              )}
            </div>
          </form>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          {isLiveWallet ? (
            <Button
              type="button"
              onClick={handleCheckDeposits}
              disabled={isSubmitting || !walletAddress}
            >
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Check for deposits
            </Button>
          ) : (
            <Button type="submit" form="deposit-form" disabled={isSubmitting || !amount || parseFloat(amount) <= 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Deposit
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

