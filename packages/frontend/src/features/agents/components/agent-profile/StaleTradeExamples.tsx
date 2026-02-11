'use client';

import { Card, CardContent } from '@/shared/components/ui/card';
import { Info } from 'lucide-react';

interface StaleTradeExamplesProps {
  minHoldTimeMinutes: number;
  minProfitPercent: number;
  maxProfitPercent: number;
}

/**
 * Stale Trade Examples Component
 * 
 * Shows working examples to help users understand when stale trade auto-close triggers.
 */
export function StaleTradeExamples({ 
  minHoldTimeMinutes, 
  minProfitPercent, 
  maxProfitPercent 
}: StaleTradeExamplesProps) {
  // Generate examples based on the configured range
  const generateExamples = () => {
    const examples: Array<{
      scenario: string;
      holdTime: number;
      profit: number;
      willClose: boolean;
      explanation: string;
    }> = [];

    // Example 1: Within range (positive)
    if (minProfitPercent >= 0 && maxProfitPercent >= 0) {
      const midRange = Math.round((minProfitPercent + maxProfitPercent) / 2);
      examples.push({
        scenario: `Position up ${midRange}% after 2 hours`,
        holdTime: 120,
        profit: midRange,
        willClose: true,
        explanation: `Will close (between ${minProfitPercent}% and ${maxProfitPercent}% range, past ${minHoldTimeMinutes} min)`,
      });
    }

    // Example 2: Within range (negative)
    if (minProfitPercent < 0 && maxProfitPercent < 0) {
      const midRange = Math.round((minProfitPercent + maxProfitPercent) / 2);
      examples.push({
        scenario: `Position down ${Math.abs(midRange)}% after 2 hours`,
        holdTime: 120,
        profit: midRange,
        willClose: true,
        explanation: `Will close (between ${minProfitPercent}% and ${maxProfitPercent}% range, past ${minHoldTimeMinutes} min)`,
      });
    }

    // Example 3: Within range (mixed - negative to positive)
    if (minProfitPercent < 0 && maxProfitPercent > 0) {
      examples.push({
        scenario: 'Position at break-even after 2 hours',
        holdTime: 120,
        profit: 0,
        willClose: true,
        explanation: `Will close (between ${minProfitPercent}% and ${maxProfitPercent}% range, past ${minHoldTimeMinutes} min)`,
      });
    }

    // Example 4: Too early (hasn't been held long enough)
    const testProfit = minProfitPercent >= 0 ? Math.round((minProfitPercent + maxProfitPercent) / 2) : 
                       maxProfitPercent < 0 ? Math.round((minProfitPercent + maxProfitPercent) / 2) : 0;
    examples.push({
      scenario: `Position ${testProfit >= 0 ? 'up' : 'down'} ${Math.abs(testProfit)}% after ${Math.max(1, Math.floor(minHoldTimeMinutes / 2))} min`,
      holdTime: Math.max(1, Math.floor(minHoldTimeMinutes / 2)),
      profit: testProfit,
      willClose: false,
      explanation: `Won't close (hasn't been held long enough)`,
    });

    // Example 5: Outside range (too high profit)
    if (maxProfitPercent >= 0) {
      examples.push({
        scenario: `Position up ${maxProfitPercent + 5}% after 2 hours`,
        holdTime: 120,
        profit: maxProfitPercent + 5,
        willClose: false,
        explanation: `Won't close (profit exceeds ${maxProfitPercent}%, let it run)`,
      });
    }

    // Example 6: Outside range (too low profit/loss)
    if (minProfitPercent < 0) {
      examples.push({
        scenario: `Position down ${Math.abs(minProfitPercent) + 5}% after 2 hours`,
        holdTime: 120,
        profit: minProfitPercent - 5,
        willClose: false,
        explanation: `Won't close (loss exceeds ${minProfitPercent}%, stop loss handles larger losses)`,
      });
    } else if (minProfitPercent > 0) {
      examples.push({
        scenario: 'Position at break-even after 2 hours',
        holdTime: 120,
        profit: 0,
        willClose: false,
        explanation: `Won't close (below ${minProfitPercent}% minimum)`,
      });
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
              Positions held for at least <strong>{minHoldTimeMinutes} minutes</strong> with profit/loss 
              between <strong>{minProfitPercent}%</strong> and <strong>{maxProfitPercent}%</strong> will be 
              automatically closed to free up capital for new opportunities.
              {minProfitPercent < 0 && ' Negative values allow closing losing positions.'}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {examples.map((example, index) => (
            <div
              key={index}
              className="border rounded-lg p-3 bg-background text-sm"
            >
              <div className="flex items-start gap-2 mb-2">
                <span className={example.willClose ? 'text-green-500' : 'text-red-500'}>
                  {example.willClose ? '✓' : '✗'}
                </span>
                <div className="flex-1">
                  <p className="font-medium mb-1">{example.scenario}</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-muted-foreground">
                    <div>
                      <span className="font-medium">Hold Time:</span> {example.holdTime} min
                    </div>
                    <div>
                      <span className="font-medium">Profit/Loss:</span> {example.profit > 0 ? '+' : ''}{example.profit}%
                    </div>
                    <div>
                      <span className="font-medium">Result:</span>{' '}
                      <span className={example.willClose ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                        {example.willClose ? 'Will close' : "Won't close"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                {example.explanation}
              </p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
