'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Info } from 'lucide-react';
import { getDCALevelsForMode } from '@nexgent/shared';
import type { DCAMode, DCALevel } from '@nexgent/shared';

interface DCAExamplesProps {
  mode: DCAMode;
  customLevels?: DCALevel[];
}

/**
 * DCA Examples Component
 * 
 * Shows simple working examples based on selected mode to help users understand 
 * how DCA works with price drops and average price updates.
 */
export function DCAExamples({ mode, customLevels = [] }: DCAExamplesProps) {
  // Generate examples based on mode
  const generateExamples = () => {
    const basePrice = 1.00;
    const baseTokens = 100;
    let examples: Array<{
      step: number;
      price: number;
      priceDrop: number;
      tokensBefore: number;
      avgPriceBefore: number;
      buyAmount: number;
      tokensBought: number;
      tokensAfter: number;
      avgPriceAfter: number;
      explanation: string;
    }> = [];

    const levels = mode === 'custom' ? customLevels : getDCALevelsForMode(mode);
    
    if (levels.length === 0) {
      return examples;
    }

    let currentTokens = baseTokens;
    let currentAvgPrice = basePrice;
    let totalInvested = basePrice * baseTokens;

    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const priceDrop = Math.abs(level.dropPercent);
      const currentPrice = currentAvgPrice * (1 - priceDrop / 100);
      
      // Calculate buy amount (percentage of current position value)
      const currentPositionValue = currentPrice * currentTokens;
      const buyAmount = (currentPositionValue * level.buyPercent) / 100;
      const tokensBought = buyAmount / currentPrice;
      
      // Calculate new average
      const newTotalInvested = totalInvested + buyAmount;
      const newTotalTokens = currentTokens + tokensBought;
      const newAvgPrice = newTotalInvested / newTotalTokens;

      examples.push({
        step: i + 1,
        price: Math.round(currentPrice * 1000) / 1000,
        priceDrop: priceDrop,
        tokensBefore: Math.round(currentTokens),
        avgPriceBefore: Math.round(currentAvgPrice * 1000) / 1000,
        buyAmount: Math.round(buyAmount * 100) / 100,
        tokensBought: Math.round(tokensBought),
        tokensAfter: Math.round(newTotalTokens),
        avgPriceAfter: Math.round(newAvgPrice * 1000) / 1000,
        explanation: `Price drops ${priceDrop}% to $${currentPrice.toFixed(3)}. Agent buys ${level.buyPercent}% more (${Math.round(tokensBought)} tokens for $${buyAmount.toFixed(2)}). Average price improves from $${currentAvgPrice.toFixed(3)} to $${newAvgPrice.toFixed(3)}.`,
      });

      // Update for next iteration
      currentTokens = newTotalTokens;
      currentAvgPrice = newAvgPrice;
      totalInvested = newTotalInvested;
    }

    return examples;
  };

  const examples = generateExamples();

  if (examples.length === 0) {
    return null;
  }

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">How it works</h4>
            <p className="text-sm text-muted-foreground">
              When price drops to a DCA level, the agent automatically buys more tokens. 
              Each buy lowers your average purchase price, making it easier to break even or profit when price recovers.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {examples.map((example, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 bg-background text-sm"
            >
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center mb-2">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Price Drops</p>
                  <p className="font-medium">-{example.priceDrop}%</p>
                  <p className="text-xs text-muted-foreground">${example.price.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Before DCA</p>
                  <p className="font-medium">{example.tokensBefore} tokens</p>
                  <p className="text-xs text-muted-foreground">Avg: ${example.avgPriceBefore.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Buys</p>
                  <p className="font-medium text-primary">+{example.tokensBought} tokens</p>
                  <p className="text-xs text-muted-foreground">${example.buyAmount.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">After DCA</p>
                  <p className="font-medium">{example.tokensAfter} tokens</p>
                  <p className="text-xs text-muted-foreground">Avg: ${example.avgPriceAfter.toFixed(3)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Improvement</p>
                  <p className="font-medium text-green-600">
                    ${(example.avgPriceBefore - example.avgPriceAfter).toFixed(3)}
                  </p>
                  <p className="text-xs text-muted-foreground">lower avg</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {example.explanation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
