'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getStorageString, setStorageString } from '@/shared/utils/storage';
import { apiClient } from '@/infrastructure/api/client/api-client';

type CurrencyPreference = 'USD' | 'SOL';

interface CurrencyContextType {
  currencyPreference: CurrencyPreference;
  setCurrencyPreference: (preference: CurrencyPreference) => void;
  solPrice: number;
  setSolPrice: (price: number) => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

/**
 * Fetch SOL price from backend API
 */
async function fetchSolPrice(): Promise<number> {
  const response = await apiClient.get('/api/v1/price-feeds/sol-usd');
  if (!response.ok) {
    throw new Error('Failed to fetch price');
  }
  const data = await response.json();
  return parseFloat(data.price);
}

/**
 * Currency context provider
 * 
 * Manages global currency preference (USD/SOL) and SOL price state.
 * Persists currency preference to localStorage for user convenience.
 * Fetches SOL price from backend API and updates automatically.
 * 
 * @example
 * ```tsx
 * <CurrencyProvider>
 *   <App />
 * </CurrencyProvider>
 * ```
 */
export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currencyPreference, setCurrencyPreferenceState] = useState<CurrencyPreference>('USD');
  const [solPrice, setSolPriceState] = useState<number>(0);

  // Load currency preference from localStorage on mount
  useEffect(() => {
    const saved = getStorageString('currencyPreference', null) as CurrencyPreference | null;
    if (saved === 'USD' || saved === 'SOL') {
      setCurrencyPreferenceState(saved);
    }
  }, []);

  // Fetch price from backend API
  const { data: fetchedPrice } = useQuery({
    queryKey: ['sol-price'],
    queryFn: fetchSolPrice,
    refetchInterval: 30000, // 30 seconds
    staleTime: 10000, // 10 seconds
  });

  // Update solPrice when fetched price changes
  useEffect(() => {
    if (fetchedPrice !== undefined) {
      setSolPriceState(fetchedPrice);
    }
  }, [fetchedPrice]);

  // Save currency preference to localStorage when it changes
  const setCurrencyPreference = (preference: CurrencyPreference) => {
    setCurrencyPreferenceState(preference);
    // State still updates even if persistence fails (graceful degradation)
    setStorageString('currencyPreference', preference);
  };

  return (
    <CurrencyContext.Provider
      value={{
        currencyPreference,
        setCurrencyPreference,
        solPrice,
        setSolPrice: setSolPriceState,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

/**
 * Hook to access currency context
 * 
 * @returns Currency context with preference, setter, SOL price, and setter
 * @throws Error if used outside CurrencyProvider
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { currencyPreference, setCurrencyPreference } = useCurrency();
 *   return <div>Current: {currencyPreference}</div>;
 * }
 * ```
 */
export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}

