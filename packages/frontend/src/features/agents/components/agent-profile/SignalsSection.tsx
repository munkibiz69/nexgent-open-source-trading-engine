'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form';
import { Slider } from '@/shared/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import { HelpCircle, Info, Signal, Filter } from 'lucide-react';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { useFormContext } from 'react-hook-form';
import { SignalTypeSelector } from './SignalTypeSelector';
import type { AgentTradingConfigFormValues } from './trading-config-form-schema';

/**
 * Signals Section Component
 *
 * Configures signal filtering settings for the agent:
 * - Minimum signal strength
 * - Allowed signal types
 *
 * Token filter (blacklist/whitelist) and token metrics are in Risk Management tab.
 */
export function SignalsSection() {
  const form = useFormContext<AgentTradingConfigFormValues>();
  const allowedSignalTypes = form.watch('signals.allowedSignalTypes') || [];

  return (
    <div className="space-y-6">
      {/* Signal Strength Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Signal className="h-5 w-5" />
            Signal Strength
          </CardTitle>
          <CardDescription>
            Filter signals by their strength rating
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FormField
            control={form.control}
            name="signals.minScore"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FormLabel>Minimum Signal Strength</FormLabel>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            aria-label="Signal strength help"
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-[300px]">
                          <p>
                            Signals are rated 1-5 based on their strength.
                            Higher values mean stronger signals.
                            Only signals meeting or exceeding this threshold will trigger trades.
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <span className="text-2xl font-bold tabular-nums">{field.value}</span>
                </div>
                <FormControl>
                  <Slider
                    min={1}
                    max={5}
                    step={1}
                    value={[field.value]}
                    onValueChange={(value) => field.onChange(value[0])}
                    className="py-4"
                  />
                </FormControl>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1 (Weakest)</span>
                  <span>5 (Strongest)</span>
                </div>
                <FormDescription>
                  Only signals with strength ≥ {field.value} will trigger trades
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </CardContent>
      </Card>

      {/* Signal Types Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Signal Types
          </CardTitle>
          <CardDescription>
            Choose which signal types can trigger trades
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <SignalTypeSelector />

          {allowedSignalTypes.length === 0 && (
            <Alert className="bg-muted/50">
              <Info className="h-4 w-4" />
              <AlertDescription>
                All signal types are accepted. Add specific types above to filter.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
