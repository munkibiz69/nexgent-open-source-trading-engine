'use client';

/**
 * Trading Signals Table Component
 * 
 * Displays a table of trading signals with pagination, filtering, sorting, and CSV export.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/shared/components/ui/pagination';
import { ExternalLink } from 'lucide-react';
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import type { TradingSignal } from '@/shared/types/api.types';
import type { TradingSignalsTableProps } from '../../types/trading-signal.types';
import { abbreviateAddress } from '@/shared/utils/formatting';
import { TableSkeleton } from '@/shared/components/loading';

// Format time to relative time (e.g., "5m ago", "2h ago")
function formatSignalAge(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = differenceInSeconds(now, date);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = differenceInMinutes(now, date);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = differenceInHours(now, date);
  if (hours < 24) return `${hours}h ago`;
  const days = differenceInDays(now, date);
  return `${days}d ago`;
}

export type TradingSignalSortOption = 'most_recent' | 'highest_strength' | 'oldest';

interface TradingSignalsTableInternalProps extends TradingSignalsTableProps {
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  // Filter props
  tokenFilter?: string;
  sortBy?: TradingSignalSortOption;
  onTokenFilterChange?: (value: string) => void;
  onSortByChange?: (value: TradingSignalSortOption) => void;
  // Expose filtered signals count
  onFilteredSignalsChange?: (signals: TradingSignal[]) => void;
}

export function TradingSignalsTable({
  signals,
  isLoading = false,
  onSignalClick,
  currentPage,
  itemsPerPage,
  onPageChange,
  tokenFilter: externalTokenFilter,
  sortBy: externalSortBy,
  onTokenFilterChange,
  onSortByChange,
  onFilteredSignalsChange,
}: TradingSignalsTableInternalProps) {
  // Use external filter state if provided, otherwise use internal state
  const [internalTokenFilter, setInternalTokenFilter] = useState('');
  const [internalSortBy, setInternalSortBy] = useState<TradingSignalSortOption>('most_recent');
  
  const tokenFilter = externalTokenFilter ?? internalTokenFilter;
  const sortBy = externalSortBy ?? internalSortBy;
  const setTokenFilter = onTokenFilterChange ?? setInternalTokenFilter;
  const setSortBy = onSortByChange ?? setInternalSortBy;

  // Filtering and sorting logic
  const filteredSignals = useMemo(() => {
    let filtered = [...signals];

    // Filter by token address or symbol
    if (tokenFilter) {
      filtered = filtered.filter((signal) =>
        (signal.symbol?.toLowerCase().includes(tokenFilter.toLowerCase()) ?? false) ||
        signal.tokenAddress.toLowerCase().includes(tokenFilter.toLowerCase())
      );
    }

    // Sorting logic
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'most_recent') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'highest_strength') {
        return (b.signalStrength || 0) - (a.signalStrength || 0);
      } else if (sortBy === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return 0;
    });

    return filtered;
  }, [signals, tokenFilter, sortBy]);

  // Expose filtered signals to parent
  useEffect(() => {
    onFilteredSignalsChange?.(filteredSignals);
  }, [filteredSignals, onFilteredSignalsChange]);

  // Reset page when filters change
  useEffect(() => {
    onPageChange(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokenFilter, sortBy]);

  // Pagination logic
  const totalPages = Math.ceil(filteredSignals.length / itemsPerPage);
  const displayedSignals = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredSignals.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredSignals, currentPage, itemsPerPage]);

  if (isLoading) {
    return <TableSkeleton rows={7} columns={6} />;
  }

  const hasActiveFilters = tokenFilter !== '' || sortBy !== 'most_recent';

  return (
    <>

      <div className="rounded-md border relative overflow-x-auto w-full min-h-[150px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">Signal Age</TableHead>
              <TableHead className="w-[160px]">Signal Strength</TableHead>
              <TableHead className="w-[160px]">Token</TableHead>
              <TableHead className="w-[250px] hidden md:table-cell">Trading Strategy</TableHead>
              <TableHead className="w-auto hidden md:table-cell">Activation Reason</TableHead>
              <TableHead className="w-[140px] hidden md:table-cell">Source</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {displayedSignals.length > 0 ? (
              displayedSignals.map((signal) => (
                <TableRow
                  key={signal.id}
                  className="cursor-pointer hover:bg-accent/40"
                  onClick={() => onSignalClick?.(signal)}
                >
                  <TableCell className="w-[90px]">
                    {formatSignalAge(signal.createdAt)}
                  </TableCell>
                  <TableCell className="w-[160px]">
                    {/* Signal Strength Meter: 1-5 filled circles */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => {
                        const signalStrength = Math.max(1, Math.min(5, signal.signalStrength || 1));
                        const isFilled = i < signalStrength;
                        return (
                          <span
                            key={i}
                            style={{
                              display: 'inline-block',
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: isFilled
                                ? 'linear-gradient(135deg, #16B364 60%, #A7F3D0 100%)'
                                : '#2d2d2d',
                              boxShadow: isFilled ? '0 0 4px #16B36488' : 'none',
                              border: isFilled ? '1.5px solid #16B364' : '1.5px solid #444',
                              transition: 'background 0.3s',
                            }}
                          />
                        );
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                      <span>{signal.symbol || abbreviateAddress(signal.tokenAddress)}</span>
                      <a
                        href={`https://dexscreener.com/solana/${signal.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {signal.symbol ? null : (
                          <span className="font-mono">{abbreviateAddress(signal.tokenAddress)}</span>
                        )}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell className="w-[140px] hidden md:table-cell">
                    {signal.signalType || <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell className="w-auto hidden md:table-cell">
                    {signal.activationReason || <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                  <TableCell className="w-[140px] hidden md:table-cell">
                    {signal.source || <span className="text-muted-foreground">N/A</span>}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-muted-foreground">
                      {hasActiveFilters
                        ? 'No signals match the current filters. Try adjusting your filters.'
                        : 'No active signals detected. Connect this trading engine to any signal provider or platform of your choice.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {/* Pagination */}
      {filteredSignals.length > itemsPerPage && (
        <div className="flex justify-center mt-4 mb-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(Math.max(1, currentPage - 1));
                  }}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
              <PaginationItem>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(1);
                  }}
                  isActive={currentPage === 1}
                >
                  1
                </PaginationLink>
              </PaginationItem>
              {currentPage > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {currentPage > 2 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage - 1);
                    }}
                  >
                    {currentPage - 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              {currentPage !== 1 && currentPage !== totalPages && (
                <PaginationItem>
                  <PaginationLink href="#" isActive={true}>
                    {currentPage}
                  </PaginationLink>
                </PaginationItem>
              )}
              {currentPage < totalPages - 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(currentPage + 1);
                    }}
                  >
                    {currentPage + 1}
                  </PaginationLink>
                </PaginationItem>
              )}
              {currentPage < totalPages - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {totalPages > 1 && (
                <PaginationItem>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      onPageChange(totalPages);
                    }}
                    isActive={currentPage === totalPages}
                  >
                    {totalPages}
                  </PaginationLink>
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    onPageChange(Math.min(totalPages, currentPage + 1));
                  }}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : ''}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </>
  );
}

