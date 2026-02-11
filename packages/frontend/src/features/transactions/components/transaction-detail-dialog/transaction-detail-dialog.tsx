'use client';

/**
 * Transaction Detail Dialog Component
 * 
 * Displays detailed information about a selected transaction in a modal dialog.
 * Matches the reference design with From/To sections for swap transactions,
 * route details, and comprehensive transaction metadata.
 * 
 * Features:
 * - Detailed swap information with input/output tokens and prices
 * - Route plan details showing DEX/platform information
 * - Copy-to-clipboard functionality for addresses and IDs
 * - Support for all transaction types (SWAP, DEPOSIT, BURN)
 * - Currency-aware formatting (USD/SOL)
 */

import { Dialog, DialogContent, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Copy } from 'lucide-react';
import type { AgentTransaction } from '@/shared/types/api.types';
import { useToast } from '@/shared/hooks/use-toast';
import { useCurrency } from '@/shared/contexts/currency.context';
import { formatPrice } from '@/shared/utils/formatting';
import type { TransactionDetailDialogProps } from '../../types/transaction.types';

/**
 * Route plan structure from transaction routes JSON
 */
interface RoutePlan {
  bps?: number;
  percent?: number;
  swapInfo?: {
    label?: string;
    ammKey?: string;
    feeMint?: string;
    inAmount?: string;
    feeAmount?: string;
    inputMint?: string;
    outAmount?: string;
    outputMint?: string;
  };
}

/**
 * Complete routes data structure from transaction
 */
interface RoutesData {
  swapMode?: string;
  routePlan?: RoutePlan[];
  slippageBps?: number; // Slippage in basis points (100 = 1%)
  priceImpactPct?: string | number;
  isClosingTransaction?: boolean;
}

/**
 * Transaction Detail Dialog Component
 * 
 * @param transaction - The transaction to display (null when dialog is closed)
 * @param isOpen - Whether the dialog is currently open
 * @param onOpenChange - Callback when dialog open state changes
 * @param solPrice - Current SOL price in USD for currency conversion
 */
export function TransactionDetailDialog({
  transaction,
  isOpen,
  onOpenChange,
  solPrice,
}: TransactionDetailDialogProps) {
  const { currencyPreference } = useCurrency();

  const { toast } = useToast();

  /**
   * Copy text to clipboard and show toast notification
   * 
   * @param text - Text to copy to clipboard
   * @param label - Label for the toast notification
   */
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: `${label} copied to clipboard`,
    });
  };

  /**
   * Format monetary value in USD or SOL
   * Negative numbers are formatted as -$130.00 (minus before currency symbol)
   * 
   * @param value - Value as string (from API)
   * @param isUsd - Whether to format as USD (true) or SOL (false)
   * @returns Formatted value string
   */
  const formatValue = (value: string | null, isUsd: boolean = true) => {
    if (!value) return 'N/A';
    const numValue = parseFloat(value);
    const isNegative = numValue < 0;
    const absValue = Math.abs(numValue);
    const negativePrefix = isNegative ? '-' : '';
    
    if (isUsd) {
      return `${negativePrefix}$${absValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    } else {
      const solValue = solPrice > 0 ? absValue / solPrice : 0;
      return `${negativePrefix}${solValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })} SOL`;
    }
  };

  /**
   * Helper to safely parse float values
   */
  const safeParseFloat = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return 0;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isNaN(parsed) ? 0 : parsed;
  };

  /**
   * Format transaction amount with appropriate decimals (SOL: at least 4, others: 2)
   */
  const formatTransactionAmount = (value: number, symbol: string): string => {
    const decimals = symbol === 'SOL' ? 4 : 2;
    return value.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: 8 });
  };

  /**
   * Abbreviate address for display (shows first 8 and last 8 characters)
   * 
   * Used specifically in transaction detail dialog to match reference design.
   * 
   * @param address - Full address string
   * @returns Abbreviated address (e.g., "AbCdEfGh...XyZz1234")
   */
  const abbreviateAddress = (address: string) => {
    if (!address || address.length < 16) return address;
    return `${address.slice(0, 8)}...${address.slice(-8)}`;
  };

  /**
   * Format transaction date to match reference design
   * 
   * @param dateString - ISO date string
   * @returns Formatted date string in format "Nov 25, 2025 • 07:02 PM"
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }) + ' • ' + date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  if (!transaction) return null;

  // Parse routes data from JSON
  let routesData: RoutesData | null = null;
  if (transaction.routes && typeof transaction.routes === 'object') {
    try {
      routesData = transaction.routes as RoutesData;
    } catch (error) {
      console.error('Error parsing routes:', error);
    }
  }

  /**
   * Extract DEX/platform names from route plan
   * 
   * @returns Comma-separated string of DEX names, or null if none found
   */
  const getDexNames = (): string | null => {
    if (!routesData?.routePlan || !Array.isArray(routesData.routePlan)) {
      return null;
    }
    const labels = routesData.routePlan
      .map((r) => r.swapInfo?.label)
      .filter((label): label is string => Boolean(label));
    return labels.length > 0 ? labels.join(', ') : null;
  };


  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogTitle className="sr-only">Transaction Details</DialogTitle>
        
        {/* Header */}
        <div className="mb-4">
          <div className="text-xl font-bold text-left">Transaction Details</div>
          <div className="text-muted-foreground text-sm text-left">
            Detailed summary of the selected transaction.
          </div>
        </div>

        {/* SWAP Transaction Details */}
        {transaction.transactionType === 'SWAP' && (
          <>
            {/* From Section */}
            <div className="p-4 bg-muted/30 border rounded-lg mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">From</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {transaction.inputAmount ? formatTransactionAmount(parseFloat(transaction.inputAmount), transaction.inputSymbol || '') : '0.00'} {transaction.inputSymbol || ''}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Token Price (USD): {transaction.inputMint === 'So11111111111111111111111111111111111111112'
                        ? (solPrice > 0 ? formatPrice(solPrice, true) : 'N/A')
                        : (transaction.inputPrice && solPrice
                          ? formatPrice(safeParseFloat(transaction.inputPrice) * solPrice, true)
                          : 'N/A')}
                    </div>
                    {transaction.inputMint !== 'So11111111111111111111111111111111111111112' && transaction.inputPrice && (
                      <div>
                        Token Price (SOL): {formatPrice(safeParseFloat(transaction.inputPrice), false)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Token Address</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {transaction.inputMint ? abbreviateAddress(transaction.inputMint) : 'N/A'}
                    </span>
                    {transaction.inputMint && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleCopy(transaction.inputMint!, 'Token address')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Arrow */}
            <div className="flex justify-center mb-4">
              <div className="p-2 bg-primary/10 rounded-full">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <path d="M8 3L4 7l4 4"/>
                  <path d="M4 7h16"/>
                  <path d="M16 21l4-4-4-4"/>
                  <path d="M20 17H4"/>
                </svg>
              </div>
            </div>

            {/* To Section */}
            <div className="p-4 bg-muted/30 border rounded-lg mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">To</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {transaction.outputAmount ? formatTransactionAmount(parseFloat(transaction.outputAmount), transaction.outputSymbol || '') : '0.00'} {transaction.outputSymbol || ''}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Token Price (USD): {transaction.outputMint === 'So11111111111111111111111111111111111111112'
                        ? (solPrice > 0 ? formatPrice(solPrice, true) : 'N/A')
                        : (transaction.outputPrice && solPrice
                          ? formatPrice(safeParseFloat(transaction.outputPrice) * solPrice, true)
                          : 'N/A')}
                    </div>
                    {transaction.outputMint !== 'So11111111111111111111111111111111111111112' && transaction.outputPrice && (
                      <div>
                        Token Price (SOL): {formatPrice(safeParseFloat(transaction.outputPrice), false)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Token Address</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {transaction.outputMint ? abbreviateAddress(transaction.outputMint) : 'N/A'}
                    </span>
                    {transaction.outputMint && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleCopy(transaction.outputMint!, 'Token address')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Type and Time */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <span className="font-medium capitalize">
                  {transaction.transactionType === 'SWAP'
                    ? `Swap${getDexNames() ? ` Via ${getDexNames()}` : ''}`
                    : (transaction.transactionType as 'DEPOSIT' | 'BURN').toLowerCase()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="font-medium">{formatDate(transaction.transactionTime)}</span>
              </div>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {transaction.signalId ? (
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Signal ID</span>
                  <span className="font-medium">{transaction.signalId}</span>
                </div>
              ) : (
                <div></div>
              )}
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total Value (USD)</span>
                <span className="font-medium">{formatValue(transaction.transactionValueUsd)}</span>
              </div>
            </div>

            {transaction.priceImpact != null && (
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Slippage</span>
                  <span className="font-medium">
                    {transaction.priceImpact ? `${(Math.abs(parseFloat(transaction.priceImpact)) * 100).toFixed(2)}%` : '0.00%'}
                  </span>
                </div>
                <div></div>
              </div>
            )}

            {/* Fees */}
            {(transaction.protocolFeeSol || transaction.networkFeeSol) && (
              <div className="grid grid-cols-2 gap-4 mb-6">
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

            {/* Route Details */}
            {routesData?.routePlan && routesData.routePlan.length > 0 && (
              <div className="space-y-3">
                <div className="text-sm font-medium">Route Details</div>
                <div className="space-y-3">
                  {routesData.routePlan.map((route, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{route.swapInfo?.label || `Route ${index + 1}`}</span>
                        <span className="text-xs text-muted-foreground">{route.percent ? `${route.percent}% of swap` : ''}</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Input Mint</div>
                          <div className="flex items-center gap-2">
                            <div className="font-mono">
                              {route.swapInfo?.inputMint ? abbreviateAddress(route.swapInfo.inputMint) : 'N/A'}
                            </div>
                            {route.swapInfo?.inputMint && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 shrink-0"
                                onClick={() => handleCopy(route.swapInfo!.inputMint!, 'Input mint')}
                              >
                                <Copy className="h-2 w-2" />
                              </Button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="text-muted-foreground">Output Mint</div>
                          <div className="flex items-center gap-2">
                            <div className="font-mono">
                              {route.swapInfo?.outputMint ? abbreviateAddress(route.swapInfo.outputMint) : 'N/A'}
                            </div>
                            {route.swapInfo?.outputMint && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 shrink-0"
                                onClick={() => handleCopy(route.swapInfo!.outputMint!, 'Output mint')}
                              >
                                <Copy className="h-2 w-2" />
                              </Button>
                            )}
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
                              {route.swapInfo?.feeMint ? abbreviateAddress(route.swapInfo.feeMint) : 'N/A'}
                            </div>
                            {route.swapInfo?.feeMint && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 shrink-0"
                                onClick={() => handleCopy(route.swapInfo!.feeMint!, 'Fee mint')}
                              >
                                <Copy className="h-2 w-2" />
                              </Button>
                            )}
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
                              {route.swapInfo?.ammKey ? abbreviateAddress(route.swapInfo.ammKey) : 'N/A'}
                            </div>
                            {route.swapInfo?.ammKey && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-4 w-4 shrink-0"
                                onClick={() => handleCopy(route.swapInfo!.ammKey!, 'AMM key')}
                              >
                                <Copy className="h-2 w-2" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Non-SWAP Transaction Details */}
        {(transaction.transactionType === 'DEPOSIT' || transaction.transactionType === 'BURN') && (
          <div className="space-y-4">
            <div className="p-4 bg-muted/30 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-muted-foreground">
                  {transaction.transactionType === 'DEPOSIT' ? 'Deposit' : 'Burn'} Details
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-2xl font-bold">
                    {transaction.inputAmount ? formatTransactionAmount(parseFloat(transaction.inputAmount), transaction.inputSymbol || '') : '0.00'} {transaction.inputSymbol || ''}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>
                      Token Price (USD): {transaction.inputMint === 'So11111111111111111111111111111111111111112'
                        ? (solPrice > 0 ? formatPrice(solPrice, true) : 'N/A')
                        : (transaction.inputPrice && solPrice
                          ? formatPrice(safeParseFloat(transaction.inputPrice) * solPrice, true)
                          : 'N/A')}
                    </div>
                    {transaction.inputMint !== 'So11111111111111111111111111111111111111112' && transaction.inputPrice && (
                      <div>
                        Token Price (SOL): {formatPrice(safeParseFloat(transaction.inputPrice), false)}
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">Token Address</div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      {transaction.inputMint ? abbreviateAddress(transaction.inputMint) : 'N/A'}
                    </span>
                    {transaction.inputMint && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => handleCopy(transaction.inputMint!, 'Token address')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Type and Time */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Type</span>
                <span className="font-medium capitalize">
                  {transaction.transactionType.toLowerCase()}
                </span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Time</span>
                <span className="font-medium">{formatDate(transaction.transactionTime)}</span>
              </div>
            </div>

            {/* Total Value */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">Total Value (USD)</span>
                <span className="font-medium">{formatValue(transaction.transactionValueUsd)}</span>
              </div>
              <div></div>
            </div>

            {transaction.destinationAddress && (
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-xs text-muted-foreground">Destination Address</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm">{abbreviateAddress(transaction.destinationAddress)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleCopy(transaction.destinationAddress!, 'Destination address')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
