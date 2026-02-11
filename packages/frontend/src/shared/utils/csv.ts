/**
 * CSV export utilities
 * 
 * Provides functions for exporting data to CSV format.
 */

import { format } from 'date-fns';
import { formatLocalTime } from './formatting';
import type { AgentTransaction } from '../types/api.types';

/** Export decimal string as-is to preserve full precision (e.g. 0.000006301425605567) */
function decimalCell(value: string | null | undefined): string {
  if (value == null || value === '') return 'N/A';
  const s = String(value).trim();
  return s === '' ? 'N/A' : s;
}

/**
 * Download transactions data as CSV file
 * 
 * @param transactions - Array of transaction data to export
 * @param currencyPreference - Currency to use for prices ('USD' or 'SOL')
 * @param solPrice - Current SOL price in USD (used for SOL conversion)
 * @throws Error if CSV generation or download fails
 * 
 * @example
 * ```ts
 * downloadTransactionsCSV(transactions, 'USD', 150);
 * ```
 */
export function downloadTransactionsCSV(
  transactions: AgentTransaction[],
  currencyPreference: 'USD' | 'SOL',
  solPrice: number
): void {
  try {
    const headers = [
      'ID',
      'Type',
      'Transaction',
      'Time',
      'Value (USD)',
      currencyPreference === 'SOL' ? 'Value (SOL)' : '',
      'Input Token',
      'Input Amount',
      'Input Price',
      'Output Token',
      'Output Amount',
      'Output Price',
      'Protocol Fee (SOL)',
      'Network Fee (SOL)',
      'Slippage (%)',
      'Signal ID',
      'Destination Address',
      'DCA',
    ].filter(Boolean); // Remove empty strings

    const rows = transactions.map((tx) => {
      const valueUsd = parseFloat(tx.transactionValueUsd || '0');
      const valueSol = solPrice > 0 ? valueUsd / solPrice : 0;

      const transactionLink = tx.transactionHash
        ? `https://solscan.io/tx/${tx.transactionHash}`
        : 'N/A';

      return [
        tx.id,
        tx.transactionType,
        transactionLink,
        formatLocalTime(tx.transactionTime),
        valueUsd.toFixed(2),
        currencyPreference === 'SOL' ? valueSol.toFixed(6) : '',
        tx.inputSymbol || 'N/A',
        decimalCell(tx.inputAmount),
        decimalCell(tx.inputPrice),
        tx.outputSymbol || 'N/A',
        decimalCell(tx.outputAmount),
        decimalCell(tx.outputPrice),
        decimalCell(tx.protocolFeeSol),
        decimalCell(tx.networkFeeSol),
        tx.priceImpact ? (Math.abs(parseFloat(tx.priceImpact)) * 100).toFixed(2) : 'N/A',
        tx.signalId != null ? String(tx.signalId) : 'N/A',
        tx.destinationAddress || 'N/A',
        tx.isDca ? 'Yes' : 'No',
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `agent-transactions-${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  } catch (error) {
    console.error('Failed to download CSV:', error);
    throw new Error('Failed to download CSV file');
  }
}

