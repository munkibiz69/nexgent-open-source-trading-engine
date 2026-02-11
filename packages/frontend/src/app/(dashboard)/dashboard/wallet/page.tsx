'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Wallet, Copy, Plus, Unlink } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { useAgentBalances } from '@/features/agents';
import { useCurrency } from '@/shared/contexts/currency.context';
import { useTradingMode } from '@/shared/contexts/trading-mode.context';
import { useAgentSelection } from '@/shared/contexts/agent-selection.context';
import { useUser } from '@/shared/contexts/user.context';
import { useWallet } from '@/shared/contexts/wallet.context';
import { CreateAgentDialog } from '@/features/agents';
import { WalletDepositDialog, WalletAssignDialog, WalletResetDialog, WalletUnassignDialog } from '@/features/wallets';
import { LoadingSpinner, ErrorState } from '@/shared/components';
import type { AgentBalance, TokenBalance, PortfolioBalance } from '@/shared/types/api.types';
import { useToast } from '@/shared/hooks/use-toast';
import { formatPrice } from '@/shared/utils/formatting';

// SOL mint address constant
const SOL_MINT_ADDRESS = 'So11111111111111111111111111111111111111112';

/**
 * Calculate portfolio balance from agent balances
 * 
 * Uses enriched priceSol from the API (cache-first approach on backend).
 * Stores priceSol and converts to USD only when needed for calculations.
 */
function calculatePortfolioBalance(
  balances: AgentBalance[],
  solPrice: number
): PortfolioBalance {
  const tokens: TokenBalance[] = balances
    .map((balance) => {
      const balanceNum = parseFloat(balance.balance);
      
      // Get priceSol from API (enriched from Redis cache or API)
      // For SOL, priceSol is always 1 if available, otherwise fallback
      let priceSol = balance.priceSol;
      if (priceSol === undefined) {
        if (balance.tokenAddress === SOL_MINT_ADDRESS) {
          // For SOL, price is 1 SOL per SOL
          priceSol = 1;
        } else {
          // Token price not available (not in cache and API fetch failed)
          priceSol = 0;
        }
      }
      
      // Calculate USD values for total portfolio calculation
      // priceUsd is used for TokenBalance interface compatibility
      const priceUsd = priceSol * solPrice;
      const totalValueUsd = balanceNum * priceUsd;

      return {
        tokenAddress: balance.tokenAddress,
        tokenSymbol: balance.tokenSymbol,
        balance: balanceNum,
        priceUsd,
        totalValueUsd,
        priceSol, // Store original SOL price for direct display use
      };
    })
    .filter((token) => token.balance > 0.001) // Filter out dust
    .sort((a, b) => b.totalValueUsd - a.totalValueUsd); // Sort by value descending

  const totalBalanceUsd = tokens.reduce((sum, token) => sum + token.totalValueUsd, 0);
  // Calculate total in SOL directly from balance * priceSol (avoids conversion errors)
  const totalBalanceSol = tokens.reduce((sum, token) => sum + (token.balance * token.priceSol), 0);

  return {
    totalBalanceUsd,
    totalBalanceSol,
    tokens,
  };
}

export default function WalletPage() {
  const { currencyPreference, solPrice } = useCurrency();
  const { tradingMode } = useTradingMode();
  const { user } = useUser();
  const { wallets, availableWallets, isLoading: isLoadingWallets, getWalletForAgent, refreshWallets } = useWallet();
  const { selectedAgentId, selectedAgent: agent } = useAgentSelection();
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [unassignDialogOpen, setUnassignDialogOpen] = useState(false);

  // Selected wallet state
  const [selectedWalletAddress, setSelectedWalletAddress] = useState<string | null>(null);
  
  // Get selected wallet
  const selectedWallet = selectedWalletAddress
    ? wallets.find((w) => w.walletAddress === selectedWalletAddress)
    : null;

  // Clear selected wallet when agent changes
  useEffect(() => {
    setSelectedWalletAddress(null);
  }, [selectedAgentId]);

  // Auto-select wallet based on trading mode - always select wallet matching current trading mode
  useEffect(() => {
    if (!selectedAgentId || !tradingMode || wallets.length === 0) {
      setSelectedWalletAddress(null);
      return;
    }

    // Always select wallet matching current trading mode
    const walletForMode = wallets.find((w) => w.walletType === tradingMode);
    
    if (walletForMode) {
      // Only update if it's different to avoid unnecessary re-renders
      if (selectedWalletAddress !== walletForMode.walletAddress) {
        setSelectedWalletAddress(walletForMode.walletAddress);
      }
    } else {
      // No wallet for current mode, clear selection
      setSelectedWalletAddress(null);
    }
  }, [tradingMode, wallets, selectedAgentId, selectedWalletAddress]);

  // Determine if we should fetch balances
  // Only fetch when we have a wallet selected (when no wallet exists, defaults to empty array = 0 balance)
  // Also wait for wallets to finish loading so we know if a wallet exists or not
  const shouldFetchBalances = !!selectedAgentId && !isLoadingWallets && !!selectedWallet?.walletAddress;

  // Fetch balances - filter by selected wallet address (balances are per-wallet)
  // When no wallet exists for the trading mode, query is disabled and defaults to empty array (0 balance)
  const { data: balances = [], isLoading: isLoadingBalances, refetch: refetchBalances } = useAgentBalances(
    selectedAgentId || undefined,
    selectedWallet?.walletAddress,
    shouldFetchBalances
  );

  // Track previous wallet address to detect changes
  const prevWalletAddressRef = useRef<string | undefined>(selectedWallet?.walletAddress);
  
  // Explicitly refetch balances when wallet address changes (e.g., when trading mode changes)
  // This ensures we get fresh data for the new wallet, not cached data from the previous wallet
  useEffect(() => {
    const currentWalletAddress = selectedWallet?.walletAddress;
    const prevWalletAddress = prevWalletAddressRef.current;
    
    // Only refetch if wallet address actually changed and we have a valid wallet
    if (currentWalletAddress && currentWalletAddress !== prevWalletAddress && shouldFetchBalances) {
      prevWalletAddressRef.current = currentWalletAddress;
      refetchBalances();
    } else if (currentWalletAddress) {
      // Update ref even if we don't refetch (to track current value)
      prevWalletAddressRef.current = currentWalletAddress;
    }
  }, [selectedWallet?.walletAddress, shouldFetchBalances, refetchBalances]);

  // Calculate portfolio balance
  const portfolio = useMemo(() => {
    return calculatePortfolioBalance(balances, solPrice);
  }, [balances, solPrice]);

  // Get SOL balance
  const solBalance = useMemo(() => {
    const solToken = balances.find((b) => b.tokenAddress === SOL_MINT_ADDRESS);
    return solToken ? parseFloat(solToken.balance) : 0;
  }, [balances]);

  // Check if user is agent owner
  const isOwner = agent?.userId === user?.id;

  // Get all wallets for agent (wallets from context are already filtered by selectedAgentId)
  const agentWallets = wallets;

  // Handle successful deposit/reset/unassign
  const handleSuccess = () => {
    refetchBalances();
  };

  const handleUnassignSuccess = () => {
    refetchBalances();
    if (selectedAgentId) {
      refreshWallets(selectedAgentId);
    }
  };

  // Copy address to clipboard
  const handleCopyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
    toast({
      title: 'Copied',
      description: 'Address copied to clipboard',
    });
  };

  // Format balance display
  const formatBalance = (value: number, currency: 'USD' | 'SOL'): string => {
    if (currency === 'USD') {
      return `$${value.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;
    } else {
      // Convert USD to SOL
      const solValue = solPrice > 0 ? value / solPrice : 0;
      return `${solValue.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} SOL`;
    }
  };

  // No agent selected
  if (!selectedAgentId) {
    return (
      <div className="flex flex-col gap-4 px-4 py-6">
        <Alert>
          <AlertDescription className="flex items-center justify-between">
            <span>No agent selected. Please create or select an agent to view wallet balances.</span>
            <Button
              variant="outline"
              className="ml-4 whitespace-nowrap border-[#16B364] text-[#16B364] hover:bg-[#16B364] hover:text-white"
              onClick={() => setCreateDialogOpen(true)}
            >
              Create Agent
            </Button>
          </AlertDescription>
        </Alert>
        <CreateAgentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <CardTitle className="text-2xl font-bold">Agent Wallet</CardTitle>
                <CardDescription className="text-muted-foreground max-w-[800px]">
                  Manage your agent&apos;s wallet balance and trading funds. Monitor your portfolio and
                  control deposits and wallet settings.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-[2fr,1fr] gap-2 sm:gap-4">
              {/* Left side - Wallet Info */}
              <div className="space-y-4 min-w-0">
                <div className="p-4 border rounded-lg bg-gradient-to-br from-card to-muted/20 w-full">
                  <div className="flex items-center justify-between mb-6">
                    <div className="space-y-1 w-full">
                      <div className="text-sm text-muted-foreground">Balance</div>
                      {isLoadingBalances ? (
                        <div className="flex items-center gap-2">
                          <LoadingSpinner size="sm" />
                          <span className="text-2xl font-bold">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-2xl font-bold flex items-center gap-3">
                            {currencyPreference === 'USD' 
                              ? formatBalance(portfolio.totalBalanceUsd, currencyPreference)
                              : `${portfolio.totalBalanceSol.toLocaleString('en-US', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 4,
                                })} SOL`}
                            <div className="h-8 w-8 rounded-full bg-[#16B364]/10 flex items-center justify-center">
                              <Wallet className="h-4 w-4 text-[#16B364]" />
                            </div>
                          </div>
                          <div className="mt-8 w-full">
                            <div className="grid grid-cols-3 md:grid-cols-[1.2fr,1.5fr,1fr,1.2fr,2.5fr] gap-6 text-sm text-muted-foreground mb-2 pb-2 border-b">
                              <div>Token</div>
                              <div className="hidden md:block text-right">Price</div>
                              <div className="text-right">Amount</div>
                              <div className="text-right">Total Value ({currencyPreference})</div>
                              <div className="hidden md:block text-right">Address</div>
                            </div>
                            {portfolio.tokens.length === 0 ? (
                              <div className="grid grid-cols-3 md:grid-cols-[1.2fr,1fr,1fr,1.2fr,2.5fr] gap-6">
                                <div className="col-span-3 md:col-span-5 text-center py-8 text-muted-foreground">
                                  No token balances found
                                </div>
                              </div>
                            ) : (
                              portfolio.tokens.map((token) => {
                                const formattedBalance = Number.isInteger(token.balance * 100)
                                  ? token.balance.toFixed(2)
                                  : token.balance.toFixed(4);
                                // Use priceSol directly for SOL display, convert to USD for USD display
                                const displayPrice = currencyPreference === 'USD' ? token.priceSol * solPrice : token.priceSol;
                                // Calculate total value: in SOL mode use balance * priceSol directly (no conversion), in USD use totalValueUsd
                                const totalValueSol = token.balance * token.priceSol;
                                const displayValue = currencyPreference === 'USD' ? token.totalValueUsd : totalValueSol;

                                return (
                                  <div
                                    key={token.tokenAddress}
                                    className="grid grid-cols-3 md:grid-cols-[1.2fr,1.5fr,1fr,1.2fr,2.5fr] gap-6 text-sm py-2 items-center"
                                  >
                                    <div className="text-muted-foreground">{token.tokenSymbol}</div>
                                    <div className="hidden md:block text-right text-muted-foreground tabular-nums whitespace-nowrap">
                                      {formatPrice(displayPrice, currencyPreference === 'USD')}
                                    </div>
                                    <div className="text-right text-muted-foreground tabular-nums">{formattedBalance}</div>
                                    <div className="text-right tabular-nums">
                                      {currencyPreference === 'USD' 
                                        ? formatBalance(displayValue, currencyPreference)
                                        : `${displayValue.toLocaleString('en-US', {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 4,
                                          })} SOL`}
                                    </div>
                                    <div className="hidden md:flex text-right font-mono text-xs text-muted-foreground items-center justify-end gap-2 min-w-0">
                                      <span className="truncate min-w-0">{token.tokenAddress}</span>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 shrink-0 hover:bg-transparent"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCopyAddress(token.tokenAddress);
                                        }}
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Wallet Management */}
              <div className="space-y-4">
                {selectedWallet ? (
                  <div className="space-y-4">
                    {/* Wallet Details Card */}
                    <div className="p-4 border rounded-lg bg-card space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium">Wallet Details</h3>
                        <Badge
                          variant={selectedWallet.walletType === 'simulation' ? 'outline' : 'default'}
                          className={
                            selectedWallet.walletType === 'simulation'
                              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                              : 'bg-green-500'
                          }
                        >
                          {selectedWallet.walletType === 'simulation' ? 'Simulation Wallet' : 'Live Wallet'}
                        </Badge>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="text-sm text-muted-foreground">Address</label>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="flex-1 text-xs font-mono bg-muted p-2 rounded truncate">
                              {selectedWallet.walletAddress}
                            </code>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyAddress(selectedWallet.walletAddress)}
                              className="shrink-0"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {selectedWallet.walletType === 'live' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setUnassignDialogOpen(true)}
                                disabled={!isOwner}
                                className="shrink-0"
                                title={!isOwner ? 'Only the agent owner can unassign the wallet' : 'Unassign wallet'}
                              >
                                <Unlink className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                        
                        {/* Quick Actions */}
                        <div className="pt-4 border-t">
                          <label className="text-sm text-muted-foreground">Quick Actions</label>
                          <div className="space-y-2 mt-1">
                            {/* Deposit Funds Button Only */}
                            <Button
                              onClick={() => setDepositDialogOpen(true)}
                              disabled={!isOwner}
                              variant="outline"
                              className="w-full"
                              title={!isOwner ? 'Only the agent owner can deposit funds' : ''}
                            >
                              <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-2 text-[#16B364]"
                              >
                                <path d="M12 20V4m0 16l-4-4m4 4l4-4" />
                              </svg>
                              Deposit Funds
                            </Button>
                            <Button
                              onClick={() => setResetDialogOpen(true)}
                              disabled={!isOwner}
                              variant="destructive"
                              className="w-full"
                              title={!isOwner ? 'Only the agent owner can reset the wallet' : ''}
                            >
                              Reset Wallet
                            </Button>
                          </div>
                        </div>

                        <div className="pt-4 border-t">
                          <label className="text-sm text-muted-foreground">Wallet Information</label>
                          <p className="text-xs text-muted-foreground mt-1">
                            {selectedWallet.walletType === 'simulation' 
                              ? 'Simulation wallets are automatically created and ready to use.'
                              : 'Live wallets are loaded from environment variables. Configure WALLET_1, WALLET_2, etc. in your .env file.'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-card space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium">Wallet Details</h3>
                      <Badge
                        variant={tradingMode === 'simulation' ? 'outline' : 'default'}
                        className={
                          tradingMode === 'simulation'
                            ? 'border-orange-500 text-orange-600 dark:text-orange-400'
                            : 'bg-green-500'
                        }
                      >
                        {tradingMode === 'simulation' ? 'Simulation Wallet' : 'Live Wallet'}
                      </Badge>
                    </div>
                    <div className="text-center py-8">
                      {tradingMode === 'simulation' ? (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">
                            Simulation wallet will be automatically created when you start trading.
                          </p>
                          <p className="text-xs text-muted-foreground">
                            No configuration needed for simulation mode.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground mb-4">
                            No live wallet assigned. Assign a wallet from your environment variables to get started.
                          </p>
                          <Button
                            onClick={() => setAssignDialogOpen(true)}
                            className="w-full sm:w-auto"
                            disabled={availableWallets.length === 0}
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Assign Wallet
                          </Button>
                          {availableWallets.length === 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              No wallets available. Configure WALLET_1, WALLET_2, etc. in your .env file and restart the server.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialogs */}
      <CreateAgentDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      <WalletDepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        agentId={selectedAgentId || ''}
        currentBalance={solBalance}
        solPrice={solPrice}
        walletType={selectedWallet?.walletType}
        walletAddress={selectedWallet?.walletAddress}
        onSuccess={handleSuccess}
      />
      <WalletAssignDialog
        open={assignDialogOpen}
        onOpenChange={(open) => {
          setAssignDialogOpen(open);
          if (!open && selectedAgentId) {
            // Refresh wallets when dialog closes to check if wallet was assigned
            refreshWallets(selectedAgentId);
          }
        }}
        agentId={selectedAgentId || ''}
        onSuccess={() => {
          if (selectedAgentId) {
            refreshWallets(selectedAgentId);
          }
        }}
      />
      {selectedWallet && (
        <>
          <WalletResetDialog
            open={resetDialogOpen}
            onOpenChange={setResetDialogOpen}
            agentId={selectedAgentId || ''}
            walletAddress={selectedWallet.walletAddress}
            walletType={selectedWallet.walletType}
            onSuccess={handleSuccess}
          />
          {selectedWallet.walletType === 'live' && (
            <WalletUnassignDialog
              open={unassignDialogOpen}
              onOpenChange={setUnassignDialogOpen}
              agentId={selectedAgentId || ''}
              walletAddress={selectedWallet.walletAddress}
              onSuccess={handleUnassignSuccess}
            />
          )}
        </>
      )}
    </>
  );
}

