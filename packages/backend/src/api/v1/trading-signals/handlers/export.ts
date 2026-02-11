/**
 * Export trading signals endpoint
 * 
 * GET /api/trading-signals/export
 * 
 * Exports trading signals to CSV format with streaming support.
 * Requires authentication.
 */

import { Response } from 'express';
import { prisma } from '@/infrastructure/database/client.js';
import type { AuthenticatedRequest } from '@/middleware/auth.js';
import type { ExportTradingSignalsQuery } from '../types.js';

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
 * Format CSV row from signal data
 */
function formatCSVRow(signal: {
  id: number;
  createdAt: Date;
  signalStrength: number | null;
  symbol: string | null;
  tokenAddress: string;
  signalType: string | null;
  activationReason: string | null;
  source: string | null;
  updatedAt: Date;
}, timezone?: string): string {
  const row = [
    signal.id.toString(),
    formatLocalTime(signal.createdAt, timezone),
    (signal.signalStrength || 0).toString(),
    signal.symbol || 'N/A',
    signal.tokenAddress,
    signal.signalType || 'N/A',
    signal.activationReason || 'N/A',
    signal.source || 'N/A',
    formatLocalTime(signal.updatedAt, timezone),
  ];
  
  return row.map(escapeCSV).join(',') + '\n';
}

/**
 * Export trading signals to CSV
 * 
 * Query params: Same as list endpoint but without pagination
 * - tokenAddress: Filter by token address
 * - signalType: Filter by signal type
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * 
 * Returns: CSV file stream
 * 
 * Error Handling:
 * - Sets 5 minute timeout for export operations
 * - Handles database connection errors gracefully
 * - Ensures stream is properly closed on errors
 * - Provides detailed error logging
 */
export async function exportTradingSignals(req: AuthenticatedRequest, res: Response) {
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
  const query = req.query as unknown as ExportTradingSignalsQuery;

  try {
    if (!req.user) {
      clearTimeout(timeout);
      return res.status(401).json({
        error: 'Unauthorized',
      });
    }

    // Build where clause — always scoped to the authenticated user (same logic as list.ts)
    const where: { userId: string; tokenAddress?: string; signalType?: string; createdAt?: { gte?: Date; lte?: Date } } = {
      userId: req.user.id,
    };

    if (query.tokenAddress) {
      where.tokenAddress = query.tokenAddress.trim();
    }

    if (query.signalType) {
      where.signalType = query.signalType.trim();
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        const startDate = new Date(query.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid start date format (use ISO date string)',
          });
        }
        where.createdAt.gte = startDate;
      }
      if (query.endDate) {
        const endDate = new Date(query.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({
            error: 'Invalid end date format (use ISO date string)',
          });
        }
        where.createdAt.lte = endDate;
      }
    }

    // Set response headers for CSV download
    const dateStr = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="trading-signals-${dateStr}.csv"`);

    // Write CSV header row
    const headers = [
      'Signal ID',
      'Created At',
      'Signal Strength',
      'Token Symbol',
      'Token Address',
      'Trading Strategy',
      'Activation Reason',
      'Source',
      'Updated At',
    ];
    res.write(headers.map(escapeCSV).join(',') + '\n');

    // Stream records in batches using cursor-based pagination
    const batchSize = 1000;
    let cursor: number | undefined;
    let totalExported = 0;

    try {
      do {
        // Check if client disconnected
        if (isClientDisconnected) {
          console.log('Export cancelled: client disconnected for trading signals');
          break;
        }

        const batch = await prisma.tradingSignal.findMany({
          where: {
            ...where,
            ...(cursor ? { id: { gt: cursor } } : {}),
          },
          select: {
            id: true,
            createdAt: true,
            updatedAt: true,
            tokenAddress: true,
            symbol: true,
            signalType: true,
            activationReason: true,
            signalStrength: true,
            source: true,
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
        for (const signal of batch) {
          // Check if client disconnected before each write
          if (isClientDisconnected) {
            break;
          }
          res.write(formatCSVRow(signal, query.timezone));
        }

        totalExported += batch.length;
        cursor = batch.length === batchSize ? batch[batch.length - 1].id : undefined;
      } while (cursor && !isClientDisconnected);

      // Clear timeout on successful completion
      clearTimeout(timeout);

      // End the response
      res.end();
      
      console.log(`Exported ${totalExported} trading signals`);
    } catch (streamError) {
      // Handle errors during streaming
      clearTimeout(timeout);
      
      // Check if it's a database connection error
      if (streamError instanceof Error) {
        const errorMessage = streamError.message.toLowerCase();
        if (errorMessage.includes('connection') || errorMessage.includes('timeout') || errorMessage.includes('prisma')) {
          console.error('Database error during trading signals export:', streamError);
          
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
    console.error(`Export trading signals error [${errorType}]:`, {
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
