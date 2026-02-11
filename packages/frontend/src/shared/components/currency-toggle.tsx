'use client';

import { memo, useCallback } from 'react';
import { useCurrency } from '@/shared/contexts/currency.context';
import { DollarSign } from 'lucide-react';

function CurrencyToggleComponent() {
  const { currencyPreference, setCurrencyPreference } = useCurrency();

  const handleUsdClick = useCallback(() => {
    setCurrencyPreference('USD');
  }, [setCurrencyPreference]);

  const handleSolClick = useCallback(() => {
    setCurrencyPreference('SOL');
  }, [setCurrencyPreference]);

  return (
    <div className="flex items-center gap-1 bg-muted p-1 rounded-md w-full md:w-auto">
      <button
        onClick={handleUsdClick}
        className={`flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors flex-1 md:flex-none ${
          currencyPreference === 'USD'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <DollarSign className="h-3 w-3" />
        USD
      </button>
      <button
        onClick={handleSolClick}
        className={`flex items-center justify-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors flex-1 md:flex-none ${
          currencyPreference === 'SOL'
            ? 'bg-background shadow-sm text-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
      >
        <svg className="h-3 w-3" viewBox="0 0 397.7 311.7" fill="currentColor">
          <defs>
            <linearGradient id="solana-gradient" x1="360.8793" y1="351.4553" x2="141.213" y2="-69.2936" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#00FFA3" />
              <stop offset="1" stopColor="#DC1FFF" />
            </linearGradient>
          </defs>
          <path
            d="M64.6,237.9c2.4-2.4,5.7-3.8,9.2-3.8h317.4c5.8,0,8.7,7,4.6,11.1l-62.7,62.7c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,237.9z"
            fill="url(#solana-gradient)"
          />
          <path
            d="M64.6,3.8C67.1,1.4,70.4,0,73.8,0h317.4c5.8,0,8.7,7,4.6,11.1L333.1,73.8c-2.4,2.4-5.7,3.8-9.2,3.8H6.5c-5.8,0-8.7-7-4.6-11.1L64.6,3.8z"
            fill="url(#solana-gradient)"
          />
          <path
            d="M333.1,120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8,0-8.7,7-4.6,11.1l62.7,62.7c2.4,2.4,5.7,3.8,9.2,3.8h317.4c5.8,0,8.7-7,4.6-11.1L333.1,120.1z"
            fill="url(#solana-gradient)"
          />
        </svg>
        SOL
      </button>
    </div>
  );
}

// Memoize component to prevent unnecessary re-renders
export const CurrencyToggle = memo(CurrencyToggleComponent);

