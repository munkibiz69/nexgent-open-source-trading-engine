'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Info } from 'lucide-react';
import type { StopLossMode, TrailingLevel } from '@nexgent/shared';
import {
  calculateFixedStepperStopLoss,
  calculateExponentialStopLoss,
  calculateZonesStopLoss,
  calculateCustomStopLoss,
} from '@/shared/utils/stop-loss-calculator';

interface StopLossExamplesProps {
  mode: StopLossMode;
  customLevels?: TrailingLevel[];
  defaultPercentage?: number;
}

/**
 * Stop Loss Examples Component
 * 
 * Shows dynamic working examples based on selected mode to help users understand 
 * how Price Increase % and Stop Loss % work, and when stop loss triggers.
 */
export function StopLossExamples({ mode, customLevels = [], defaultPercentage = -32 }: StopLossExamplesProps) {
  // Generate examples based on mode
  const generateExamples = () => {
    const basePrice = 100;
    let examples: Array<{
      purchasePrice: number;
      priceIncrease: number;
      priceAfterIncrease: number;
      stopLoss: number;
      stopLossPrice: number;
      profit: number;
      explanation: string;
    }> = [];

    switch (mode) {
      case 'fixed': {
        // Show examples at key step points: 10%, 20%, 50%, 100%
        // Note: 10% will show default percentage since trailing only activates at 20%+
        const increases = [10, 20, 50, 100];
        for (const increase of increases) {
          const stopLoss = calculateFixedStepperStopLoss(increase, defaultPercentage);
          const stopLossPrice = basePrice * (1 + stopLoss / 100);
          const profit = stopLossPrice - basePrice;
          const roundedStopLossPrice = Math.round(stopLossPrice * 100) / 100;
          const roundedProfit = Math.round(profit * 100) / 100;
          
          examples.push({
            purchasePrice: basePrice,
            priceIncrease: increase,
            priceAfterIncrease: Math.round(basePrice * (1 + increase / 100) * 100) / 100,
            stopLoss,
            stopLossPrice: roundedStopLossPrice,
            profit: roundedProfit,
            explanation: `At ${increase}% price increase, stop loss is set to ${stopLoss}%. If price pulls back to $${roundedStopLossPrice.toFixed(2)}, your position is sold, ${roundedProfit >= 0 ? `locking in $${roundedProfit.toFixed(2)} profit` : `resulting in $${Math.abs(roundedProfit).toFixed(2)} loss`}.`,
          });
        }
        break;
      }

      case 'exponential': {
        // Show examples at key points: 10%, 25%, 50%, 100%
        // Note: 10% will show default percentage since trailing only activates at 20%+
        const increases = [10, 25, 50, 100];
        for (const increase of increases) {
          const stopLoss = calculateExponentialStopLoss(increase, defaultPercentage);
          const stopLossPrice = basePrice * (1 + stopLoss / 100);
          const profit = stopLossPrice - basePrice;
          const roundedStopLoss = Math.round(stopLoss * 10) / 10;
          const roundedStopLossPrice = Math.round(stopLossPrice * 100) / 100;
          const roundedProfit = Math.round(profit * 100) / 100;
          
          examples.push({
            purchasePrice: basePrice,
            priceIncrease: increase,
            priceAfterIncrease: Math.round(basePrice * (1 + increase / 100) * 100) / 100,
            stopLoss: roundedStopLoss,
            stopLossPrice: roundedStopLossPrice,
            profit: roundedProfit,
            explanation: `At ${increase}% price increase, stop loss is set to ${roundedStopLoss}%. If price pulls back to $${roundedStopLossPrice.toFixed(2)}, your position is sold, ${roundedProfit >= 0 ? `locking in $${roundedProfit.toFixed(2)} profit` : `resulting in $${Math.abs(roundedProfit).toFixed(2)} loss`}.`,
          });
        }
        break;
      }

      case 'zones': {
        // Show examples at key points: 10%, 25%, 50%, 100%
        // Note: 10% will show default percentage since trailing only activates at 20%+
        const increases = [10, 25, 50, 100];
        for (const increase of increases) {
          const stopLoss = calculateZonesStopLoss(increase, defaultPercentage);
          const stopLossPrice = basePrice * (1 + stopLoss / 100);
          const profit = stopLossPrice - basePrice;
          const roundedStopLoss = Math.round(stopLoss * 10) / 10;
          const roundedStopLossPrice = Math.round(stopLossPrice * 100) / 100;
          const roundedProfit = Math.round(profit * 100) / 100;
          
          examples.push({
            purchasePrice: basePrice,
            priceIncrease: increase,
            priceAfterIncrease: Math.round(basePrice * (1 + increase / 100) * 100) / 100,
            stopLoss: roundedStopLoss,
            stopLossPrice: roundedStopLossPrice,
            profit: roundedProfit,
            explanation: `At ${increase}% price increase, stop loss is set to ${roundedStopLoss}%. If price pulls back to $${roundedStopLossPrice.toFixed(2)}, your position is sold, ${roundedProfit >= 0 ? `locking in $${roundedProfit.toFixed(2)} profit` : `resulting in $${Math.abs(roundedProfit).toFixed(2)} loss`}.`,
          });
        }
        break;
      }

      case 'custom': {
        if (customLevels.length > 0) {
          // Sort levels descending and take up to 4 examples
          const sorted = [...customLevels].sort((a, b) => b.change - a.change).slice(0, 4);
          for (const level of sorted) {
            const stopLossPrice = basePrice * (1 + level.stopLoss / 100);
            const profit = stopLossPrice - basePrice;
            const roundedStopLossPrice = Math.round(stopLossPrice * 100) / 100;
            const roundedProfit = Math.round(profit * 100) / 100;
            const roundedPriceAfterIncrease = Math.round(basePrice * (1 + level.change / 100) * 100) / 100;
            
            examples.push({
              purchasePrice: basePrice,
              priceIncrease: level.change,
              priceAfterIncrease: roundedPriceAfterIncrease,
              stopLoss: level.stopLoss,
              stopLossPrice: roundedStopLossPrice,
              profit: roundedProfit,
              explanation: `At ${level.change}% price increase, stop loss is set to ${level.stopLoss}%. If price pulls back to $${roundedStopLossPrice.toFixed(2)}, your position is sold, locking in $${roundedProfit.toFixed(2)} profit.`,
            });
          }
        } else {
          // Show placeholder if no custom levels
          examples.push({
            purchasePrice: basePrice,
            priceIncrease: 0,
            priceAfterIncrease: basePrice,
            stopLoss: 0,
            stopLossPrice: basePrice,
            profit: 0,
            explanation: 'Add custom trailing levels to see examples',
          });
        }
        break;
      }
    }

    return examples.slice(0, 4); // Limit to 4 examples
  };

  const examples = generateExamples();

  return (
    <Card className="bg-muted/50">
      <CardContent className="pt-6">
        <div className="flex items-start gap-3 mb-4">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-sm font-semibold">How it works</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Price Increase %</strong> = how much the price has risen above your purchase price.
              <br />
              <strong>Stop Loss %</strong> = the profit percentage you want to lock in. When the price <strong>pulls back</strong> to this level, your position is automatically sold.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {examples.length > 0 ? (
            examples.map((example, index) => (
              <div
                key={index}
                className="border rounded-lg p-3 bg-background text-sm"
              >
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-center mb-2">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Purchase Price</p>
                    <p className="font-medium">${example.purchasePrice}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Price Increases</p>
                    <p className="font-medium">+{example.priceIncrease}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Peak Price</p>
                    <p className="font-medium">${example.priceAfterIncrease.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Stop Loss Set At</p>
                    <p className="font-medium">{typeof example.stopLoss === 'number' && example.stopLoss % 1 !== 0 ? example.stopLoss.toFixed(1) : example.stopLoss}%</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">If Pulls Back To</p>
                    <p className={`font-medium ${example.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${example.stopLossPrice.toFixed(2)} ({example.profit >= 0 ? `+$${example.profit.toFixed(2)}` : `-$${Math.abs(example.profit).toFixed(2)}`} {example.profit >= 0 ? 'profit' : 'loss'})
                    </p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {example.explanation}
                </p>
              </div>
            ))
          ) : (
            <div className="border rounded-lg p-4 bg-background text-sm text-center text-muted-foreground">
              No examples available. Configure your stop loss levels to see examples.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
