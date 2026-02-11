'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Filter, Download, X, Loader2 } from 'lucide-react';
import { useTradingSignals, useExportSignals } from '@/features/trading-signals';
import { TradingSignalsTable, TradingSignalDetailDialog, TradingSignalsInfo } from '@/features/trading-signals';
import type { TradingSignalSortOption } from '@/features/trading-signals/components/trading-signals-table/trading-signals-table';
import { PageSkeleton, ErrorState } from '@/shared/components';
import type { TradingSignal } from '@/shared/types/api.types';

export default function TradeSignalsPage() {
  const [signalsPage, setSignalsPage] = useState(1);
  const signalsPerPage = 7;
  const [selectedSignal, setSelectedSignal] = useState<TradingSignal | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [tokenFilter, setTokenFilter] = useState('');
  const [sortBy, setSortBy] = useState<TradingSignalSortOption>('most_recent');
  const [filteredSignals, setFilteredSignals] = useState<TradingSignal[]>([]);

  // Fetch trading signals
  const { data: signals = [], isLoading, error, refetch } = useTradingSignals({
    limit: 1000, // Fetch enough to paginate client-side
  });

  // Export hook
  const exportSignals = useExportSignals();

  const handleSignalClick = (signal: TradingSignal) => {
    setSelectedSignal(signal);
    setIsDialogOpen(true);
  };

  const handleDownloadCSV = useCallback(() => {
    // Build export query from current filters
    // Note: sortBy is client-side only, so we don't include it in the export query
    // This now exports ALL records matching the filters (not just the 1000 limit)
    const exportQuery: any = {};

    // Add token filter if present (could be address or symbol)
    // Solana addresses are base58 encoded and typically 32-44 characters
    // Token symbols are usually much shorter (1-10 characters)
    if (tokenFilter) {
      const filterValue = tokenFilter.trim();
      // If it looks like an address (long string, typically 32+ chars), use tokenAddress
      // Otherwise, the backend will check both fields
      if (filterValue.length >= 32) {
        exportQuery.tokenAddress = filterValue;
      } else {
        // For short strings, could be symbol - backend will handle matching
        exportQuery.tokenAddress = filterValue;
      }
    }

    exportSignals.mutate(exportQuery);
  }, [tokenFilter, exportSignals]);

  const hasActiveFilters = tokenFilter !== '' || sortBy !== 'most_recent';

  return (
    <>
      <div className="flex flex-col gap-4 px-4 py-6">
        {isLoading ? (
          <PageSkeleton showHeader showCards={false} />
        ) : error ? (
          <ErrorState
            error={error}
            onRetry={() => refetch()}
            title="Failed to load trading signals"
          />
        ) : (
          <>
            <TradingSignalsInfo />
            <Card className="relative transition-all duration-300 shadow-[0_0_15px_rgba(22,179,100,0.1)]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      Trading Signals
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                    </CardTitle>
                    <CardDescription>
                      Subscribe to Nexgent&apos;s trading signals, or connect any external data source or API to provide your own signals.
                    </CardDescription>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2"
                    >
                      <Filter className="h-4 w-4" />
                      Filters
                      {hasActiveFilters && (
                        <span className="ml-1 h-2 w-2 bg-blue-500 rounded-full" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadCSV}
                      disabled={exportSignals.isPending}
                      className="flex items-center gap-2"
                    >
                      {exportSignals.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Exporting...
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          Download CSV
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* Filter Panel */}
                {showFilters && (
                  <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="token-filter">Token Address / Symbol</Label>
                        <div className="relative">
                          <Input
                            id="token-filter"
                            placeholder="Filter by token address or symbol..."
                            value={tokenFilter}
                            onChange={(e) => setTokenFilter(e.target.value)}
                          />
                          {tokenFilter && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="absolute right-1 top-1 h-6 w-6"
                              onClick={() => setTokenFilter('')}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex-1 space-y-2">
                        <Label htmlFor="sort-by">Sort By</Label>
                        <Select value={sortBy} onValueChange={(value) => setSortBy(value as TradingSignalSortOption)}>
                          <SelectTrigger>
                            <SelectValue placeholder="Sort by..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="most_recent">Most Recent</SelectItem>
                            <SelectItem value="highest_strength">Highest Strength</SelectItem>
                            <SelectItem value="oldest">Oldest</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {hasActiveFilters && (
                      <div className="flex items-center justify-between pt-2 border-t">
                        <div className="text-sm text-muted-foreground">
                          Active filters: {[
                            tokenFilter && 'Token Filter',
                            sortBy !== 'most_recent' && 'Custom Sort',
                          ].filter(Boolean).join(', ')}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setTokenFilter('');
                            setSortBy('most_recent');
                          }}
                          className="text-sm"
                        >
                          Clear All
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardHeader>
              <CardContent className="relative">
                <TradingSignalsTable
                  signals={signals}
                  isLoading={isLoading}
                  onSignalClick={handleSignalClick}
                  currentPage={signalsPage}
                  itemsPerPage={signalsPerPage}
                  onPageChange={setSignalsPage}
                  tokenFilter={tokenFilter}
                  sortBy={sortBy}
                  onTokenFilterChange={setTokenFilter}
                  onSortByChange={setSortBy}
                  onFilteredSignalsChange={setFilteredSignals}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Detail Dialog */}
      <TradingSignalDetailDialog
        signal={selectedSignal}
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
      />
    </>
  );
}

