/**
 * Export agent historical swaps endpoint
 * 
 * GET /api/agent-historical-swaps/export
 * 
 * Exports agent historical swaps to CSV format with streaming support.
 * Requires authentication. Users can only access swaps for their own agents.
 */

import { Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { ExportAgentHistoricalSwapsQuery } from '../types.js';
import { Decimal } from '@prisma/client/runtime/library';

/**
 * Format date to local time string in user's timezone (matches frontend formatLocalTime)
 * Format: "MMM dd, yyyy hh:mm:ss a" (e.g., "Jan 15, 2024 03:45:12 PM")
 * 
 * @param date - Date to format
 * @param timezone - User's timezone (e.g., "America/New_York"). Falls back to UTC if invalid.
 */
function formatLocalTime(date: Date, timezone?: string): string {
  try {
    // Use Intl.DateTimeFormat to format date in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone || 'UTC',
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parts.find(p => p.type === type)?.value || '';
    
    const month = getPart('month');
    const day = getPart('day');
    const year = getPart('year');
    const hour = getPart('hour');
    const minute = getPart('minute');
    const second = getPart('second');
    const dayPeriod = getPart('dayPeriod').toUpperCase();
    
    return `${month} ${day}, ${year} ${hour}:${minute}:${second} ${dayPeriod}`;
  } catch {
    // Fallback to UTC if timezone is invalid
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    
    let hours = date.getUTCHours();
    const minutes = date.getUTCMinutes().toString().padStart(2, '0');
    const seconds = date.getUTCSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    
    return `${month} ${day}, ${year} ${hoursStr}:${minutes}:${seconds} ${ampm}`;
  }
}

/**
 * Format price as raw number for CSV export
 * No currency symbols - just the number with full decimal precision
 * USD: 8 decimal places, SOL: 10 decimal places
 * 
 * Headers already indicate the currency, so we output raw numbers
 * that spreadsheets can properly display with all decimal places.
 */
function formatPrice(price: number, isUsd: boolean): string {
  const decimals = isUsd ? 8 : 10;
  // Use toFixed to ensure exact decimal places are preserved in CSV
  return price.toFixed(decimals);
}

/**
 * Format profit/loss value for CSV export
 * Shows +/- sign with appropriate decimal places
 * USD: 2 decimal places, SOL: 4 decimal places
 */
function formatProfitLoss(value: number, isUsd: boolean): string {
  const decimals = isUsd ? 2 : 4;
  const sign = value >= 0 ? '+' : '';
  // Use toFixed to ensure exact decimal places are preserved in CSV
  return `${sign}${value.toFixed(decimals)}`;
}

/**
 * Escape CSV value (handles quotes, commas, newlines)
 */
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  
  const str = String(value);
  
  // If value contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Format CSV row from swap data
 * Formats prices and profit/loss based on user's currency preference
 */
function formatCSVRow(swap: {
  saleTime: Date;
  tokenSymbol: string;
  tokenAddress: string;
  amount: Decimal;
  purchasePrice: Decimal;
  salePrice: Decimal;
  profitLossUsd: Decimal;
  profitLossSol: Decimal;
  changePercent: Decimal;
  signalId: number | null;
  signal: {
    signalType: string;
    activationReason: string | null;
  } | null;
}, options: { solPrice: number; currency: 'USD' | 'SOL'; timezone?: string }): string {
  const { solPrice, currency, timezone } = options;
  const isUsd = currency === 'USD';
  
  // For prices: if USD, convert SOL price to USD; if SOL, use raw SOL price
  const purchasePriceValue = isUsd
    ? parseFloat(swap.purchasePrice.toString()) * solPrice
    : parseFloat(swap.purchasePrice.toString());
  const salePriceValue = isUsd
    ? parseFloat(swap.salePrice.toString()) * solPrice
    : parseFloat(swap.salePrice.toString());
  
  // For profit/loss: use the appropriate field based on currency
  const profitLossValue = isUsd
    ? parseFloat(swap.profitLossUsd.toString())
    : parseFloat(swap.profitLossSol.toString());
  
  const row = [
    formatLocalTime(swap.saleTime, timezone),
    swap.tokenSymbol,
    swap.tokenAddress,
    parseFloat(swap.amount.toString()).toFixed(2),
    formatPrice(purchasePriceValue, isUsd),
    formatPrice(salePriceValue, isUsd),
    formatProfitLoss(profitLossValue, isUsd),
    `${parseFloat(swap.changePercent.toString()).toFixed(2)}%`,
    swap.signalId?.toString() || 'N/A',
    swap.signal?.signalType || 'N/A',
    swap.signal?.activationReason || 'N/A',
  ];
  
  return row.map(escapeCSV).join(',') + '\n';
}

/**
 * Export agent historical swaps to CSV
 * 
 * Query params: Same as list endpoint but without pagination
 * - agentId: Required - Filter by agent ID
 * - All other filters from ListAgentHistoricalSwapsQuery (except limit/offset)
 * 
 * Returns: CSV file stream
 * 
 * Error Handling:
 * - Sets 5 minute timeout for export operations
 * - Handles database connection errors gracefully
 * - Ensures stream is properly closed on errors
 * - Provides detailed error logging
 */
export async function exportAgentHistoricalSwaps(req: AuthenticatedRequest, res: Response) {
  // Set request timeout (5 minutes for large exports)
  const EXPORT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  const timeout = setTimeout(() => {
    if (!res.headersSent) {
      res.status(408).json({
        error: 'Request timeout',
        message: 'Export operation timed out. Please try again with more specific filters.',
      });
    } else {
      // If headers already sent, just end the stream
      res.end();
    }
  }, EXPORT_TIMEOUT_MS);

  // Track if stream was closed due to client disconnect
  let isClientDisconnected = false;
  req.on('close', () => {
    isClientDisconnected = true;
    clearTimeout(timeout);
  });

  // Declare query outside try block so it's accessible in catch block
  const query = req.query as unknown as ExportAgentHistoricalSwapsQuery;

  try {
    if (!req.user) {
      clearTimeout(timeout);
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Validate required agentId
    if (!query.agentId) {
      return res.status(400).json({
        error: 'Agent ID is required',
      });
    }

    // Verify agent belongs to the authenticated user
    const agent = await prisma.agent.findUnique({
      where: { id: query.agentId },
      select: { userId: true },
    });

    if (!agent) {
      return res.status(404).json({
        error: 'Agent not found',
      });
    }

    if (agent.userId !== req.user.id) {
      return res.status(403).json({
        error: 'Forbidden: You can only access swaps for your own agents',
      });
    }

    // Build where clause (same logic as list.ts)
    const where: Prisma.AgentHistoricalSwapWhereInput = {
      agentId: query.agentId,
    };

    if (query.walletAddress) {
      where.walletAddress = query.walletAddress;
    }

    if (query.tokenAddress) {
      where.tokenAddress = query.tokenAddress.trim();
    }

    if (query.tokenSymbol) {
      where.tokenSymbol = query.tokenSymbol.trim();
    }

    if (query.startPurchaseTime || query.endPurchaseTime) {
      where.purchaseTime = {};
      if (query.startPurchaseTime) {
        const startDate = new Date(query.startPurchaseTime);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid start purchase time format (use ISO date string)',
          });
        }
        where.purchaseTime.gte = startDate;
      }
      if (query.endPurchaseTime) {
        const endDate = new Date(query.endPurchaseTime);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid end purchase time format (use ISO date string)',
          });
        }
        where.purchaseTime.lte = endDate;
      }
    }

    if (query.startSaleTime || query.endSaleTime) {
      where.saleTime = {};
      if (query.startSaleTime) {
        const startDate = new Date(query.startSaleTime);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid start sale time format (use ISO date string)',
          });
        }
        where.saleTime.gte = startDate;
      }
      if (query.endSaleTime) {
        const endDate = new Date(query.endSaleTime);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid end sale time format (use ISO date string)',
          });
        }
        where.saleTime.lte = endDate;
      }
    }

    if (query.signalId) {
      const parsedSignalId = parseInt(query.signalId, 10);
      if (isNaN(parsedSignalId)) {
        return res.status(400).json({
          error: 'Signal ID must be a valid integer',
        });
      }
      where.signalId = parsedSignalId;
    }

    if (query.purchaseTransactionId) {
      where.purchaseTransactionId = query.purchaseTransactionId;
    }

    if (query.saleTransactionId) {
      where.saleTransactionId = query.saleTransactionId;
    }

    if (query.minProfitLossUsd || query.maxProfitLossUsd) {
      where.profitLossUsd = {};
      if (query.minProfitLossUsd) {
        where.profitLossUsd.gte = new Decimal(query.minProfitLossUsd);
      }
      if (query.maxProfitLossUsd) {
        where.profitLossUsd.lte = new Decimal(query.maxProfitLossUsd);
      }
    }

    // Set response headers for CSV download
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="agent-trades-${dateStr}.csv"`);

    // Parse currency preference and SOL price from query
    const currency: 'USD' | 'SOL' = query.currency === 'SOL' ? 'SOL' : 'USD';
    const solPrice = query.solPrice ? parseFloat(query.solPrice) : 100;
    const currencyLabel = currency === 'USD' ? 'USD' : 'SOL';

    // Write CSV header row (dynamic based on currency preference)
    const headers = [
      'Time',
      'Token Symbol',
      'Token Address',
      'Amount',
      `Average Purchase Price (${currencyLabel})`,
      `Sale Price (${currencyLabel})`,
      `Profit / Loss (${currencyLabel})`,
      'Change (%)',
      'Signal ID',
      'Signal Type',
      'Activation Reason',
    ];
    res.write(headers.map(escapeCSV).join(',') + '\n');

    // Stream records in batches using cursor-based pagination
    const batchSize = 1000;
    let cursor: string | undefined;
    let totalExported = 0;

    try {
      do {
        // Check if client disconnected
        if (isClientDisconnected) {
          console.log(`Export cancelled: client disconnected for agent ${query.agentId}`);
          break;
        }

        const batch = await prisma.agentHistoricalSwap.findMany({
          where: {
            ...where,
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          select: {
            id: true,
            saleTime: true,
            tokenSymbol: true,
            tokenAddress: true,
            amount: true,
            purchasePrice: true,
            salePrice: true,
            profitLossUsd: true,
            profitLossSol: true,
            changePercent: true,
            signalId: true,
            signal: {
              select: {
                signalType: true,
                activationReason: true,
              },
            },
          },
          orderBy: {
            id: 'asc', // Use ID for cursor-based pagination
          },
          take: batchSize,
        });

        if (batch.length === 0) {
          break;
        }

        // Stream each row
        for (const swap of batch) {
          // Check if client disconnected before each write
          if (isClientDisconnected) {
            break;
          }
          res.write(formatCSVRow(swap, { solPrice, currency, timezone: query.timezone }));
        }

        totalExported += batch.length;
        cursor = batch.length === batchSize ? batch[batch.length - 1].id : undefined;
      } while (cursor && !isClientDisconnected);

      // Clear timeout on successful completion
      clearTimeout(timeout);

      // End the response
      res.end();
      
      console.log(`Exported ${totalExported} historical swaps for agent ${query.agentId}`);
    } catch (streamError) {
      // Handle errors during streaming
      clearTimeout(timeout);
      
      // Check if it's a database connection error
      if (streamError instanceof Error) {
        const errorMessage = streamError.message.toLowerCase();
        if (errorMessage.includes('connection') || errorMessage.includes('timeout') || errorMessage.includes('prisma')) {
          console.error(`Database error during export for agent ${query.agentId}:`, streamError);
          
          if (!res.headersSent) {
            return res.status(503).json({
              error: 'Database connection error',
              message: 'Unable to connect to database. Please try again later.',
            });
          }
        }
      }
      
      // Re-throw to be caught by outer catch block
      throw streamError;
    }
  } catch (error) {
    // Clear timeout on error
    clearTimeout(timeout);
    
    // Determine error type for better logging and user messages
    let errorType = 'unknown';
    let userMessage = 'An error occurred while exporting data. Please try again.';
    let statusCode = 500;

    if (error instanceof Error) {
      const errorMessage = error.message.toLowerCase();
      
      if (errorMessage.includes('connection') || errorMessage.includes('prisma') || errorMessage.includes('database')) {
        errorType = 'database';
        userMessage = 'Database connection error. Please try again later.';
        statusCode = 503;
      } else if (errorMessage.includes('timeout')) {
        errorType = 'timeout';
        userMessage = 'Export operation timed out. Please try again with more specific filters.';
        statusCode = 408;
      } else if (errorMessage.includes('unauthorized') || errorMessage.includes('forbidden')) {
        errorType = 'authorization';
        userMessage = 'You do not have permission to export this data.';
        statusCode = 403;
      }
    }

    // Enhanced error logging
    console.error(`Export agent historical swaps error [${errorType}]:`, {
      agentId: query?.agentId,
      userId: req.user?.id,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      headersSent: res.headersSent,
      clientDisconnected: isClientDisconnected,
    });
    
    // Try to send error if response hasn't been sent yet
    if (!res.headersSent) {
      res.status(statusCode).json({
        error: errorType === 'unknown' ? 'Internal server error' : errorType,
        message: userMessage,
      });
    } else {
      // If headers already sent, we can't send JSON, just end the stream
      res.end();
    }
  }
}
