'use client';

import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Info } from 'lucide-react';
import type { StopLossMode } from '@nexgent/shared';

interface StrategyExplanationProps {
  mode: StopLossMode;
}

/**
 * Strategy Explanation Component
 * 
 * Shows a brief explanation of the selected stop loss strategy below the mode selector.
 */
export function StrategyExplanation({ mode }: StrategyExplanationProps) {
  const explanations: Record<StopLossMode, string> = {
    fixed: 'Stop loss moves in fixed 10% increments. For every 10% the price increases above purchase, the stop loss tightens by 10% (e.g., 10% price increase → 0% stop loss, 20% → 10% stop loss). Simple and predictable.',
    exponential: 'Momentum-based formula that models how tokens naturally gain and lose momentum. Starts with no stop loss (0-20%) to allow early volatility, then exponentially tightens as momentum builds (20-75%). Includes a natural pullback zone around 75-85% to handle temporary corrections, then resumes exponential tightening for continued gains. The curve follows organic momentum patterns using mathematical functions.',
    zones: 'Uses 5 distinct price zones (0-25%, 25-50%, 50-100%, 100-200%, 200%+) with different stop loss keep percentages for each zone. Adapts well to volatile markets by changing behavior based on price performance.',
    custom: 'Manually define discrete stop loss levels at specific price increase points. Full control over exactly when and how much profit to lock in. Best for traders who want precise control over their stop loss behavior.',
  };

  return (
    <Alert className="bg-muted/50">
      <Info className="h-4 w-4" />
      <AlertDescription className="text-sm">
        {explanations[mode]}
      </AlertDescription>
    </Alert>
  );
}

