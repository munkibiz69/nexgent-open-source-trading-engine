'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Info, Sparkles } from 'lucide-react';
import { getTakeProfitLevelsForMode, getMoonBagForMode } from '@nexgent/shared';
import type { TakeProfitMode, TakeProfitLevel, MoonBagConfig } from '@nexgent/shared';

interface TakeProfitExamplesProps {
  mode: TakeProfitMode;
  customLevels?: TakeProfitLevel[];
  moonBag?: MoonBagConfig;
}

/**
 * Take-Profit Examples Component
 * 
 * Shows working examples based on selected mode to help users understand 
 * how take-profit works with price gains and progressive selling.
 */
export function TakeProfitExamples({ mode, customLevels = [], moonBag }: TakeProfitExamplesProps) {
  // Get levels based on mode
  const levels = mode === 'custom' ? customLevels : getTakeProfitLevelsForMode(mode);
  const moonBagConfig = moonBag ?? getMoonBagForMode(mode);

  if (levels.length === 0) {
    return null;
  }

  // Generate examples with a 1 SOL position
  const baseInvestment = 1.0; // 1 SOL
  const baseTokens = 1000; // Arbitrary token amount
  const basePrice = baseInvestment / baseTokens; // Price per token

  // Track running totals
  let remainingTokens = baseTokens;
  let cumulativeProfit = 0;
  let cumulativeSoldSol = 0;
  let moonBagTokens = 0;
  let moonBagActivated = false;

  const examples = levels.map((level, idx) => {
    const currentPrice = basePrice * (1 + level.targetPercent / 100);
    const tokensToSell = Math.floor(baseTokens * (level.sellPercent / 100));
    const saleValue = tokensToSell * currentPrice;
    const costBasis = tokensToSell * basePrice;
    const profit = saleValue - costBasis;
    
    // Check if moon bag should activate at or before this level
    if (moonBagConfig.enabled && !moonBagActivated && level.targetPercent >= moonBagConfig.triggerPercent) {
      moonBagTokens = Math.floor(baseTokens * (moonBagConfig.retainPercent / 100));
      moonBagActivated = true;
    }

    remainingTokens -= tokensToSell;
    cumulativeProfit += profit;
    cumulativeSoldSol += saleValue;

    return {
      level: idx + 1,
      targetPercent: level.targetPercent,
      sellPercent: level.sellPercent,
      priceMultiple: 1 + level.targetPercent / 100,
      tokensToSell,
      saleValue: Math.round(saleValue * 1000) / 1000,
      profit: Math.round(profit * 1000) / 1000,
      remainingTokens,
      cumulativeProfit: Math.round(cumulativeProfit * 1000) / 1000,
      cumulativeSoldSol: Math.round(cumulativeSoldSol * 1000) / 1000,
      moonBagActivated,
    };
  });

  const totalSellPercent = levels.reduce((sum, l) => sum + l.sellPercent, 0);
  const moonBagValue = moonBagConfig.enabled 
    ? Math.round(moonBagTokens * basePrice * 1000) / 1000 
    : 0;

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">Example: 1 SOL Position (1,000 tokens)</h4>
            <p className="text-sm text-muted-foreground">
              As price rises to each target, the agent automatically sells a portion of your <em>original</em> position 
              to lock in profits while maintaining exposure to further gains.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {examples.map((example) => (
            <div
              key={example.level}
              className="border rounded-lg p-3 bg-background text-sm"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Target Gain</p>
                  <p className="font-medium text-green-600">+{example.targetPercent}%</p>
                  <p className="text-xs text-muted-foreground">{example.priceMultiple.toFixed(1)}x price</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sell Amount</p>
                  <p className="font-medium">{example.sellPercent}%</p>
                  <p className="text-xs text-muted-foreground">{example.tokensToSell} tokens</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Sale Value</p>
                  <p className="font-medium">{example.saleValue.toFixed(3)} SOL</p>
                  <p className="text-xs text-muted-foreground">+{example.profit.toFixed(3)} profit</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Remaining</p>
                  <p className="font-medium">{example.remainingTokens} tokens</p>
                  <p className="text-xs text-muted-foreground">{Math.round(example.remainingTokens / baseTokens * 100)}% of original</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total Received</p>
                  <p className="font-medium">{example.cumulativeSoldSol.toFixed(3)} SOL</p>
                  <p className="text-xs text-green-600">+{example.cumulativeProfit.toFixed(3)} profit</p>
                </div>
              </div>
              {example.moonBagActivated && example.level === examples.findIndex(e => e.moonBagActivated) + 1 && (
                <div className="mt-2 pt-2 border-t flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs">
                    Moon bag activated: {moonBagConfig.retainPercent}% ({moonBagTokens} tokens) set aside for potential moonshot
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="mt-4 pt-4 border-t">
          <div className="grid grid-cols-3 gap-6">
            {/* Sold */}
            <div className="text-center p-3 rounded-lg bg-black border">
              <p className="text-xs text-gray-400 mb-1">Total Sold</p>
              <p className="text-lg font-bold text-white">{cumulativeSoldSol.toFixed(2)} SOL</p>
              <p className="text-xs text-gray-400">{totalSellPercent}% of position</p>
            </div>
            
            {/* Profit */}
            <div className="text-center p-3 rounded-lg bg-black border">
              <p className="text-xs text-gray-400 mb-1">Total Profit</p>
              <p className="text-lg font-bold text-green-600">+{cumulativeProfit.toFixed(2)} SOL</p>
              <p className="text-xs text-gray-400">+{Math.round(cumulativeProfit / baseInvestment * 100)}% return</p>
            </div>
            
            {/* Moon Bag */}
            {moonBagConfig.enabled && (
              <div className="text-center p-3 rounded-lg bg-black border">
                <p className="text-xs text-gray-400 mb-1">Moon Bag</p>
                <p className="text-lg font-bold text-yellow-600">{moonBagConfig.retainPercent}%</p>
                <p className="text-xs text-gray-400">{moonBagTokens} tokens held</p>
              </div>
            )}
          </div>
          
          {/* Original investment reminder */}
          <p className="text-xs text-center text-muted-foreground mt-3">
            Based on original investment of {baseInvestment} SOL
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
