'use client';

/**
 * Listening for Signals Component
 * 
 * Displays an animated indicator when the agent has sufficient balance
 * but no active positions, indicating it's actively listening for trading signals.
 * 
 * @module features/positions/components/listening-for-signals
 */

import Link from 'next/link';

export interface ListeningForSignalsProps {
  /**
   * Optional className for additional styling
   */
  className?: string;
}

/**
 * Listening for Signals Component
 * 
 * Shows an animated radar/sweep animation indicating the agent is actively
 * monitoring the market for trading opportunities.
 * 
 * @example
 * ```tsx
 * <ListeningForSignals />
 * ```
 */
export function ListeningForSignals({ className }: ListeningForSignalsProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-8 px-4 ${className || ''}`}>
      {/* Radar sweep animation */}
      <div className="relative mb-4">
        <div className="relative w-16 h-16">
          {/* Radar circles */}
          <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-[#16B364]/30"></div>
          <div className="absolute inset-2 w-12 h-12 rounded-full border-2 border-[#16B364]/40"></div>
          <div className="absolute inset-4 w-8 h-8 rounded-full border-2 border-[#16B364]/50"></div>
          
          {/* Sweeping radar line */}
          <div className="absolute inset-0 w-16 h-16 rounded-full overflow-hidden">
            <div 
              className="absolute w-full h-0.5 origin-center"
              style={{ 
                background: `linear-gradient(to right, transparent, #16B364, transparent)`,
                top: '50%',
                transformOrigin: 'center',
                animation: 'radar-sweep 3s linear infinite'
              }}
            ></div>
          </div>
          
          {/* Center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[#16B364]"></div>
        </div>
      </div>

      {/* Descriptive text */}
      <div className="text-center mt-3">
        <h3 className="text-lg font-medium mb-2">Listening for trading signals...</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Your agent is live and{' '}
          <Link 
            href="/dashboard/trade-signals" 
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
          >
            tracking trading signals
          </Link>
          {' '}in real time. It will automatically act on opportunities aligned with your strategy.
        </p>
      </div>

      {/* Scanning line animation */}
      <div className="mt-4 w-48 h-1 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full w-1/3" 
          style={{ 
            background: `linear-gradient(to right, rgba(22, 179, 100, 0.3), #16B364, rgba(22, 179, 100, 0.3))`,
            animation: 'scan 2s ease-in-out infinite'
          }}
        ></div>
      </div>
    </div>
  );
}

