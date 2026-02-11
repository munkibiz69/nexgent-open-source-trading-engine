'use client';

/**
 * Trading Signal Detail Dialog Component
 * 
 * Displays detailed information about a selected trading signal.
 */

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { differenceInSeconds, differenceInMinutes, differenceInHours, differenceInDays } from 'date-fns';
import type { TradingSignal } from '@/shared/types/api.types';
import type { TradingSignalDetailDialogProps } from '../../types/trading-signal.types';

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

// Format exact timestamp with date and time
function formatExactTimestamp(dateString: string): string {
  return format(new Date(dateString), 'MMM dd, yyyy hh:mm:ss a');
}


export function TradingSignalDetailDialog({
  signal,
  isOpen,
  onOpenChange,
}: TradingSignalDetailDialogProps) {
  if (!signal) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle className="sr-only">Trading Signal Details</DialogTitle>
        <div className="mb-2">
          <div className="text-xl font-bold text-left">Trading Signal Details</div>
          <div className="text-muted-foreground text-sm text-left">
            Detailed summary of the selected trading signal.
          </div>
        </div>
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Signal Age</span>
            <span className="font-medium">{formatSignalAge(signal.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Exact Timestamp</span>
            <span className="font-medium">{formatExactTimestamp(signal.createdAt)}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Signal Strength</span>
            <span>
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
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Token Symbol</span>
            <span className="font-medium">{signal.symbol || 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Token Address</span>
            <div className="flex items-center gap-2">
              <span className="font-mono break-all">{signal.tokenAddress}</span>
              <a
                href={`https://dexscreener.com/solana/${signal.tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Trading Strategy</span>
            <span className="font-medium">{signal.signalType || 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Activation Reason</span>
            <span className="font-medium">{signal.activationReason || 'N/A'}</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Source</span>
            <span className="font-medium">{signal.source || 'N/A'}</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

