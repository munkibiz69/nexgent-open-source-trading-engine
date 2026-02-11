'use client';

/**
 * Trade Detail Dialog Component
 * 
 * Displays detailed information about a selected trade, including overview,
 * buy transaction, and sell transaction details.
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/shared/components/ui/tabs';
import { Copy } from 'lucide-react';
import { useTransaction, useTransactions } from '@/features/transactions';
import type { TransactionRoutes, RoutePlanStep } from '@/features/transactions/types/transaction.types';
import { formatLocalTime, formatCurrency, formatPrice } from '@/shared/utils/formatting';
import type { AgentHistoricalSwap, AgentTransaction } from '@/shared/types/api.types';
import type { TradeDetailDialogProps } from '../../types/trade.types';
import { LoadingSpinner } from '@/shared/components';

/**
 * Type guard to check if routes has routePlan
 */
function hasRoutePlan(routes: unknown): routes is TransactionRoutes {
  return (
    typeof routes === 'object' &&
    routes !== null &&
    'routePlan' in routes &&
    Array.isArray((routes as TransactionRoutes).routePlan)
  );
}

/**
 * Extract route labels from transaction routes
 */
function getRouteLabels(routes: unknown): string {
  if (!hasRoutePlan(routes)) return '';
  const labels = routes.routePlan
    ?.map((r: RoutePlanStep) => r.swapInfo?.label)
    .filter(Boolean);
  return labels?.length ? ` via ${labels.join(', ')}` : '';
}

/**
 * Get transaction type display text
 */
function getTransactionTypeText(transaction: AgentTransaction): string {
  if (transaction.transactionType === 'SWAP') {
    return `Swap${getRouteLabels(transaction.routes)}`;
  }
  return transaction.transactionType;
}

/**
 * Safely parse a value that can be string or number
 */
function safeParseFloat(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format transaction amount with appropriate decimals (SOL: at least 4, others: 2)
 */
function formatTransactionAmount(value: number, symbol: string): string {
  const decimals = symbol === 'SOL' ? 4 : 2;
  return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: 8 });
}

/**
 * Transaction Details Component
 * 
 * Reusable component to display transaction details (used for both original purchase and DCA purchases)
 */
function TransactionDetails({
  transaction,
  solPrice,
  showLabel,
}: {
  transaction: AgentTransaction;
  solPrice: number;
  showLabel?: string;
}) {
  return (
    <div className="space-y-6">
      {showLabel && (
        <div className="text-sm font-medium text-muted-foreground border-b pb-2">
          {showLabel}
        </div>
      )}

      {/* Swap Details */}
      <div className="space-y-4">
        {/* From Section */}
        <div className="p-4 bg-muted/30 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">From</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {transaction.inputAmount && transaction.inputSymbol
                  ? `${formatTransactionAmount(safeParseFloat(transaction.inputAmount), transaction.inputSymbol)} ${transaction.inputSymbol}`
                  : transaction.inputSymbol
                    ? `N/A ${transaction.inputSymbol}`
                    : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                <div>
                  Token Price (USD): {transaction.inputPrice && solPrice
                    ? formatPrice(safeParseFloat(transaction.inputPrice) * solPrice, true)
                    : 'N/A'}
                </div>
                {transaction.inputMint !== 'So11111111111111111111111111111111111111112' && (
                  <div>
                    Token Price (SOL): {transaction.inputPrice
                      ? formatPrice(safeParseFloat(transaction.inputPrice), false)
                      : 'N/A'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Token Address</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {transaction.inputMint
                    ? `${transaction.inputMint.slice(0, 8)}...${transaction.inputMint.slice(-8)}`
                    : ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() =>
                    transaction.inputMint &&
                    navigator.clipboard.writeText(transaction.inputMint)
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Swap Arrow */}
        <div className="flex justify-center">
          <div className="p-2 bg-muted rounded-full">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-white"
            >
              <path d="M8 3L4 7l4 4" />
              <path d="M4 7h16" />
              <path d="M16 21l4-4-4-4" />
              <path d="M20 17H4" />
            </svg>
          </div>
        </div>

        {/* To Section */}
        <div className="p-4 bg-muted/30 border rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-muted-foreground">To</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="text-2xl font-bold">
                {transaction.outputAmount && transaction.outputSymbol
                  ? `${formatTransactionAmount(safeParseFloat(transaction.outputAmount), transaction.outputSymbol)} ${transaction.outputSymbol}`
                  : 'N/A'}
              </div>
              <div className="text-sm text-muted-foreground">
                <div>
                  Token Price (USD): {transaction.outputPrice && solPrice
                    ? formatPrice(safeParseFloat(transaction.outputPrice) * solPrice, true)
                    : 'N/A'}
                </div>
                {transaction.outputMint !== 'So11111111111111111111111111111111111111112' && (
                  <div>
                    Token Price (SOL): {transaction.outputPrice
                      ? formatPrice(safeParseFloat(transaction.outputPrice), false)
                      : 'N/A'}
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground">Token Address</div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-muted-foreground">
                  {transaction.outputMint
                    ? `${transaction.outputMint.slice(0, 8)}...${transaction.outputMint.slice(-8)}`
                    : ''}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() =>
                    transaction.outputMint &&
                    navigator.clipboard.writeText(transaction.outputMint)
                  }
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Type and Time - Moved under swap details */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Type</span>
          <span className="font-medium capitalize">
            {getTransactionTypeText(transaction)}
          </span>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Time</span>
          <span className="font-medium">{formatLocalTime(transaction.transactionTime)}</span>
        </div>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Total Value (USD)</span>
          <span className="font-medium">
            ${safeParseFloat(transaction.transactionValueUsd).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
        {transaction.priceImpact != null ? (
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Slippage</span>
            <span className="font-medium">
              {transaction.priceImpact != null
                ? `${(Math.abs(safeParseFloat(transaction.priceImpact)) * 100).toFixed(2)}%`
                : 'N/A'}
            </span>
          </div>
        ) : (
          <div></div>
        )}
      </div>

      {/* Fees */}
      {(transaction.protocolFeeSol || transaction.networkFeeSol) && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Protocol Fee</span>
            <span className="font-medium">
              {transaction.protocolFeeSol
                ? `${parseFloat(transaction.protocolFeeSol).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 9 })} SOL`
                : '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Network Fee</span>
            <span className="font-medium">
              {transaction.networkFeeSol
                ? `${parseFloat(transaction.networkFeeSol).toLocaleString('en-US', { minimumFractionDigits: 6, maximumFractionDigits: 9 })} SOL`
                : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Route Information */}
      {hasRoutePlan(transaction.routes) && (
        <div className="space-y-3">
          <div className="text-sm font-medium">Route Details</div>
          <div className="space-y-3">
            {transaction.routes.routePlan?.map((route: RoutePlanStep, index: number) => (
              <div key={index} className="p-3 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{route.swapInfo?.label || 'N/A'}</span>
                  <span className="text-xs text-muted-foreground">{route.percent || 0}% of swap</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Input Mint</div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono">
                        {route.swapInfo?.inputMint
                          ? `${route.swapInfo.inputMint.slice(0, 8)}...${route.swapInfo.inputMint.slice(-8)}`
                          : ''}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 shrink-0"
                        onClick={() =>
                          route.swapInfo?.inputMint &&
                          navigator.clipboard.writeText(route.swapInfo.inputMint)
                        }
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Output Mint</div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono">
                        {route.swapInfo?.outputMint
                          ? `${route.swapInfo.outputMint.slice(0, 8)}...${route.swapInfo.outputMint.slice(-8)}`
                          : ''}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 shrink-0"
                        onClick={() =>
                          route.swapInfo?.outputMint &&
                          navigator.clipboard.writeText(route.swapInfo.outputMint)
                        }
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">In Amount (Lamports)</div>
                    <div className="font-mono">{route.swapInfo?.inAmount || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Out Amount (Lamports)</div>
                    <div className="font-mono">{route.swapInfo?.outAmount || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Fee Amount (Lamports)</div>
                    <div className="font-mono">{route.swapInfo?.feeAmount || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Fee Mint</div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono">
                        {route.swapInfo?.feeMint
                          ? `${route.swapInfo.feeMint.slice(0, 8)}...${route.swapInfo.feeMint.slice(-8)}`
                          : ''}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 shrink-0"
                        onClick={() =>
                          route.swapInfo?.feeMint &&
                          navigator.clipboard.writeText(route.swapInfo.feeMint)
                        }
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">Label</div>
                    <div className="font-mono">{route.swapInfo?.label || 'N/A'}</div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-muted-foreground">AMM Key</div>
                    <div className="flex items-center gap-2">
                      <div className="font-mono">
                        {route.swapInfo?.ammKey
                          ? `${route.swapInfo.ammKey.slice(0, 8)}...${route.swapInfo.ammKey.slice(-8)}`
                          : ''}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 shrink-0"
                        onClick={() =>
                          route.swapInfo?.ammKey &&
                          navigator.clipboard.writeText(route.swapInfo.ammKey)
                        }
                      >
                        <Copy className="h-2 w-2" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TradeDetailDialog({
  swap,
  isOpen,
  onOpenChange,
  currencyPreference,
  solPrice,
}: TradeDetailDialogProps) {
  const [tradeDetailsTab, setTradeDetailsTab] = useState<'buy' | 'sell'>('buy');

  // Fetch transaction details when dialog opens
  const purchaseTransactionId = swap?.purchaseTransactionId;
  const saleTransactionId = swap?.saleTransactionId;

  const { data: purchaseTransaction } = useTransaction(purchaseTransactionId || undefined);
  const { data: saleTransaction } = useTransaction(saleTransactionId || undefined);

  // Fetch DCA transactions for this trade
  // Filter by agentId, tokenAddress, isDca=true, and time range between purchase and sale
  const { data: allDcaTransactions = [], isLoading: isLoadingDCAs } = useTransactions({
    agentId: swap?.agentId || '',
    transactionType: 'SWAP',
    isDca: true,
    startTime: swap?.purchaseTime,
    endTime: swap?.saleTime,
    limit: 1000,
    offset: 0,
  });

  // Fetch Take-Profit transactions for this trade
  // Filter by agentId, tokenAddress, isTakeProfit=true, and time range between purchase and sale
  const { data: allTakeProfitTransactions = [], isLoading: isLoadingTakeProfits } = useTransactions({
    agentId: swap?.agentId || '',
    transactionType: 'SWAP',
    isTakeProfit: true,
    startTime: swap?.purchaseTime,
    endTime: swap?.saleTime,
    limit: 1000,
    offset: 0,
  });

  // Filter DCA transactions to match this trade's token address and sort by time (oldest first)
  const dcaTransactions = useMemo(() => {
    if (!swap || !purchaseTransaction) return [];
    
    return allDcaTransactions
      .filter((tx) => {
        // Match by token address (check outputMint for purchases)
        const matchesToken = tx.outputMint?.toLowerCase() === swap.tokenAddress.toLowerCase();
        // Ensure it's between purchase and sale time
        const txTime = new Date(tx.transactionTime).getTime();
        const purchaseTime = new Date(swap.purchaseTime).getTime();
        const saleTime = new Date(swap.saleTime).getTime();
        const isInTimeRange = txTime > purchaseTime && txTime < saleTime;
        
        return matchesToken && isInTimeRange;
      })
      .sort((a, b) => {
        // Sort by transaction time (oldest first)
        return new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime();
      });
  }, [allDcaTransactions, swap, purchaseTransaction]);

  // Filter Take-Profit transactions to match this trade's token address and sort by time (oldest first)
  const takeProfitTransactions = useMemo(() => {
    if (!swap) return [];
    
    return allTakeProfitTransactions
      .filter((tx) => {
        // Match by token address (check inputMint for sales - selling tokens for SOL)
        const matchesToken = tx.inputMint?.toLowerCase() === swap.tokenAddress.toLowerCase();
        // Ensure it's between purchase and sale time
        const txTime = new Date(tx.transactionTime).getTime();
        const purchaseTime = new Date(swap.purchaseTime).getTime();
        const saleTime = new Date(swap.saleTime).getTime();
        const isInTimeRange = txTime > purchaseTime && txTime <= saleTime;
        
        return matchesToken && isInTimeRange;
      })
      .sort((a, b) => {
        // Sort by transaction time (oldest first)
        return new Date(a.transactionTime).getTime() - new Date(b.transactionTime).getTime();
      });
  }, [allTakeProfitTransactions, swap]);

  // Reset to buy tab when dialog opens with new swap
  useEffect(() => {
    if (swap && isOpen) {
      setTradeDetailsTab('buy');
    }
  }, [swap, isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        {swap && (
          <>
            <DialogHeader>
              <DialogTitle>Recent Agent Trade Details</DialogTitle>
              <DialogDescription>
                Detailed summary of the selected completed trade.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Overview Section */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Token</label>
                  <div className="mt-1">
                    <div className="font-medium">{swap.tokenSymbol}</div>
                    <div className="text-xs text-muted-foreground font-mono mt-1">
                      {swap.tokenAddress}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <div className="mt-1 font-medium">
                    {parseFloat(swap.amount).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Signal ID</label>
                  <div className="mt-1 font-medium">
                    {swap.signalId || (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Trade Size (SOL)</label>
                  <div className="mt-1 font-medium">
                    {purchaseTransaction?.inputAmount && purchaseTransaction?.inputSymbol === 'SOL'
                      ? formatPrice(parseFloat(purchaseTransaction.inputAmount), false)
                      : purchaseTransaction?.transactionValueUsd && solPrice
                        ? formatPrice(parseFloat(purchaseTransaction.transactionValueUsd) / solPrice, false)
                        : 'N/A'}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Average Purchase Price ({currencyPreference})</label>
                  <div className="mt-1 font-medium">
                    {formatPrice(
                      currencyPreference === 'USD' 
                        ? parseFloat(swap.purchasePrice) * solPrice 
                        : parseFloat(swap.purchasePrice),
                      currencyPreference === 'USD'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Sale Price ({currencyPreference})</label>
                  <div className="mt-1 font-medium">
                    {formatPrice(
                      currencyPreference === 'USD' 
                        ? parseFloat(swap.salePrice) * solPrice 
                        : parseFloat(swap.salePrice),
                      currencyPreference === 'USD'
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Profit / Loss ({currencyPreference})</label>
                  <div className="mt-1">
                    <span
                      className={`font-medium ${
                        (currencyPreference === 'USD' ? parseFloat(swap.profitLossUsd) : parseFloat(swap.profitLossSol)) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(
                        currencyPreference === 'USD' ? parseFloat(swap.profitLossUsd) : parseFloat(swap.profitLossSol),
                        currencyPreference,
                        solPrice,
                        { showSign: true }
                      )}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Price Change</label>
                  <div className="mt-1">
                    <span
                      className={`font-medium ${
                        parseFloat(swap.changePercent) >= 0
                          ? 'text-green-600'
                          : parseFloat(swap.changePercent) < 0
                            ? 'text-red-600'
                            : ''
                      }`}
                    >
                      {parseFloat(swap.changePercent) !== undefined && parseFloat(swap.changePercent) !== null
                        ? `${(parseFloat(swap.changePercent) >= 0 ? '+' : '') + parseFloat(swap.changePercent).toFixed(2)}%`
                        : ''}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Closure Reason</label>
                  <div className="mt-1 font-medium">
                    {swap.closeReason ? (
                      <span className="capitalize">{swap.closeReason.replace('_', ' ')}</span>
                    ) : (
                      <span className="text-muted-foreground">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Time</label>
                  <div className="mt-1 font-medium">
                    {formatLocalTime(swap.saleTime)}
                  </div>
                </div>
              </div>

              <Tabs
              value={tradeDetailsTab}
              onValueChange={(value) => {
                setTradeDetailsTab(value as 'buy' | 'sell');
              }}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="buy">Buy Transaction</TabsTrigger>
                <TabsTrigger value="sell">Sell Transaction</TabsTrigger>
              </TabsList>

              <TabsContent value="buy" className="space-y-6 mt-4 min-h-[600px]">
                {!purchaseTransaction ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No buy transaction found for this trade
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Original Purchase */}
                    <TransactionDetails 
                      transaction={purchaseTransaction} 
                      solPrice={solPrice}
                      showLabel="Original Purchase"
                    />

                    {/* DCA Purchases */}
                    {isLoadingDCAs ? (
                      <div className="text-center py-8">
                        <LoadingSpinner size="sm" text="Loading DCA transactions..." />
                      </div>
                    ) : dcaTransactions.length > 0 ? (
                      <div className="space-y-6">
                        {dcaTransactions.map((dcaTransaction, index) => (
                          <div key={dcaTransaction.id}>
                            {index > 0 && <div className="border-t pt-6 mb-6" />}
                            <TransactionDetails 
                              transaction={dcaTransaction} 
                              solPrice={solPrice}
                              showLabel={`DCA Purchase #${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="sell" className="space-y-6 mt-4 min-h-[600px]">
                {!saleTransaction && takeProfitTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No sell transaction found for this trade
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Take-Profit Sales */}
                    {isLoadingTakeProfits ? (
                      <div className="text-center py-8">
                        <LoadingSpinner size="sm" text="Loading take-profit transactions..." />
                      </div>
                    ) : takeProfitTransactions.length > 0 ? (
                      <div className="space-y-6">
                        {takeProfitTransactions.map((tpTransaction, index) => (
                          <div key={tpTransaction.id}>
                            {index > 0 && <div className="border-t pt-6 mb-6" />}
                            <TransactionDetails 
                              transaction={tpTransaction} 
                              solPrice={solPrice}
                              showLabel={`Take-Profit Sale #${index + 1}`}
                            />
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {/* Final Sale (if different from take-profit) */}
                    {saleTransaction && (
                      <>
                        {takeProfitTransactions.length > 0 && <div className="border-t pt-6 mb-6" />}
                        <TransactionDetails 
                          transaction={saleTransaction} 
                          solPrice={solPrice}
                          showLabel={takeProfitTransactions.length > 0 ? "Final Sale" : undefined}
                        />
                      </>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

