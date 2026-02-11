/**
 * Formatting utilities for display
 * 
 * Provides reusable formatting functions for dates, prices, addresses, and other display values.
 */

import { format } from 'date-fns';

/**
 * Format date to local time string
 * 
 * @param date - Date object or ISO string
 * @returns Formatted date string (e.g., "Jan 15, 2024 03:45:12 PM")
 * 
 * @example
 * ```ts
 * formatLocalTime(new Date()) // "Jan 15, 2024 03:45:12 PM"
 * formatLocalTime('2024-01-15T15:45:12Z') // "Jan 15, 2024 03:45:12 PM"
 * ```
 */
export function formatLocalTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMM dd, yyyy hh:mm:ss a');
}

/**
 * Format price with currency symbol
 * 
 * For live trade and recent agent trade tables/modals:
 * - SOL prices: 10 decimal places
 * - USD prices: 8 decimal places
 * 
 * Negative numbers are formatted as -$130.00 (minus before currency symbol).
 * 
 * @param price - Price value (number or string)
 * @param isUsd - Whether to format as USD
 * @returns Formatted price string (e.g., "$1,234.56789000", "-$130.12345678" or "0.0000019870 SOL")
 * 
 * @example
 * ```ts
 * formatPrice(1234.56789, true) // "$1,234.56789000"
 * formatPrice(-130.12345678, true) // "-$130.12345678"
 * formatPrice(0.000001987, false) // "0.0000019870 SOL"
 * formatPrice(1.2345678901, false) // "1.2345678901 SOL"
 * formatPrice(null, true) // "N/A"
 * ```
 */
export function formatPrice(price: number | string | undefined | null, isUsd: boolean): string {
  if (price === undefined || price === null) return 'N/A';
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return 'N/A';
  
  const isNegative = numPrice < 0;
  const absPrice = Math.abs(numPrice);
  const negativePrefix = isNegative ? '-' : '';
  
  if (isUsd) {
    // For USD prices: 8 decimal places
    return `${negativePrefix}$${absPrice.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`;
  }
  
  // For SOL prices: 10 decimal places
  return `${negativePrefix}${absPrice.toFixed(10)} SOL`;
}

/**
 * Format a currency value with proper negative number formatting
 * 
 * Formats negative numbers as -$130.00 (minus before currency symbol).
 * Used for profit/loss and other values that can be negative.
 * 
 * Note: The value parameter should already be in the target currency (USD or SOL).
 * No conversion is performed - this function only formats the display.
 * 
 * @param value - Numeric value to format (already in target currency)
 * @param currencyPreference - 'USD' or 'SOL'
 * @param solPrice - Current SOL price (optional, not used in calculation)
 * @param options - Formatting options
 * @returns Formatted currency string
 * 
 * @example
 * ```ts
 * formatCurrency(-130.50, 'USD') // "-$130.50"
 * formatCurrency(130.50, 'USD') // "$130.50"
 * formatCurrency(-0.5, 'SOL') // "-0.50 SOL"
 * formatCurrency(130.50, 'USD', 100, { showSign: true }) // "+$130.50"
 * ```
 */
export function formatCurrency(
  value: number | undefined | null,
  currencyPreference: 'USD' | 'SOL',
  solPrice: number = 1,
  options: { showSign?: boolean; decimals?: number } = {}
): string {
  if (value === undefined || value === null || isNaN(value)) return 'N/A';
  
  const { showSign = false, decimals = 2 } = options;
  const isNegative = value < 0;
  const absValue = Math.abs(value);
  
  // Determine the sign prefix
  let signPrefix = '';
  if (isNegative) {
    signPrefix = '-';
  } else if (showSign && value > 0) {
    signPrefix = '+';
  }
  
  if (currencyPreference === 'USD') {
    const formatted = absValue.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: decimals 
    });
    return `${signPrefix}$${formatted}`;
  } else {
    // Value is already in SOL - no conversion needed
    const formatted = absValue.toLocaleString(undefined, { 
      minimumFractionDigits: decimals, 
      maximumFractionDigits: Math.max(decimals, 4) 
    });
    return `${signPrefix}${formatted} SOL`;
  }
}

/**
 * Format very small numbers with significant digits + 4 more decimals
 * 
 * Finds the first non-zero digit and shows it plus 4 more decimal places.
 * 
 * @param num - Number to format
 * @param prefix - Prefix to add (e.g., "$" for USD)
 * @returns Formatted string
 * 
 * @example
 * ```ts
 * formatSmallNumber(0.000001987) // "0.0000019870"
 * formatSmallNumber(0.0000001234) // "0.0000001234"
 * ```
 */
function formatSmallNumber(num: number, prefix: string = ''): string {
  if (num === 0) return `${prefix}0.0000`;
  
  const absNum = Math.abs(num);
  
  // Convert to string to find first non-zero digit
  // Use toFixed with high precision to avoid scientific notation
  let numStr = absNum.toFixed(20);
  
  // Find decimal point
  const decimalIndex = numStr.indexOf('.');
  if (decimalIndex === -1) {
    return `${prefix}${num.toFixed(4)}`;
  }
  
  // Count zeros after decimal point
  let firstNonZeroIndex = decimalIndex + 1;
  while (firstNonZeroIndex < numStr.length && numStr[firstNonZeroIndex] === '0') {
    firstNonZeroIndex++;
  }
  
  if (firstNonZeroIndex >= numStr.length) {
    // All zeros after decimal, show 4 decimals
    return `${prefix}${num.toFixed(4)}`;
  }
  
  // Calculate total decimals needed: position of first non-zero + 4 more
  // Subtract 1 because firstNonZeroIndex is 1-based after decimal point
  const decimalsNeeded = (firstNonZeroIndex - decimalIndex) + 3; // +3 to get 4 more digits after first non-zero
  
  // Format with appropriate decimals, but cap at reasonable max (20)
  const decimals = Math.min(decimalsNeeded, 20);
  const formatted = absNum.toFixed(decimals);
  
  // Remove trailing zeros but keep at least 4 decimals after first non-zero
  let trimmed = formatted;
  const firstNonZeroPos = formatted.indexOf('.') + (firstNonZeroIndex - decimalIndex);
  const minLength = firstNonZeroPos + 4; // Keep first non-zero + 4 more
  
  if (trimmed.length > minLength) {
    // Only trim if we have more than needed
    trimmed = trimmed.slice(0, minLength);
  }
  
  return `${prefix}${num < 0 ? '-' : ''}${trimmed}`;
}

/**
 * Abbreviate Solana address
 * 
 * Shows first 4 and last 4 characters of an address.
 * 
 * @param address - Full address string
 * @returns Abbreviated address (e.g., "AbCd...XyZz")
 * 
 * @example
 * ```ts
 * abbreviateAddress('AbCdEfGhIjKlMnOpQrStUvWxYz1234567890') // "AbCd...7890"
 * abbreviateAddress('') // ""
 * ```
 */
export function abbreviateAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

