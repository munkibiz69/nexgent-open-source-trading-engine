'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { useFormContext } from 'react-hook-form';
import { GripVertical, TrendingUp, Layers, Settings } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import type { AgentTradingConfigFormValues } from './trading-config-form-schema';
import type { StopLossMode } from '@nexgent/shared';

/**
 * Stop Loss Mode Selector Component
 * 
 * Enhanced card-style button selector for choosing stop loss calculation mode.
 * Matches the style of the general/data page with icons and gradient backgrounds.
 */
export function StopLossModeSelector() {
  const form = useFormContext<AgentTradingConfigFormValues>();

  const modes: Array<{
    value: StopLossMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      value: 'fixed',
      label: 'Fixed Stepper',
      description: 'Linear 10% steps',
      icon: GripVertical,
    },
    {
      value: 'exponential',
      label: 'Exponential Decay',
      description: 'Smooth exponential curve',
      icon: TrendingUp,
    },
    {
      value: 'zones',
      label: 'Step-Based Zones',
      description: '5-zone system',
      icon: Layers,
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Manual levels',
      icon: Settings,
    },
  ];

  const handleModeChange = (newMode: StopLossMode) => {
    form.setValue('stopLoss.mode', newMode, { shouldDirty: true, shouldValidate: true });
    
    // If switching to custom mode and no levels exist, initialize with defaults
    if (newMode === 'custom') {
      const currentLevels = form.getValues('stopLoss.trailingLevels');
      if (currentLevels.length === 0) {
        // Initialize with default levels if empty
        form.setValue(
          'stopLoss.trailingLevels',
          [
            { change: 200, stopLoss: 90 },
            { change: 150, stopLoss: 80 },
            { change: 100, stopLoss: 60 },
            { change: 50, stopLoss: 20 },
            { change: 20, stopLoss: 10 },
          ],
          { shouldDirty: true }
        );
      }
    }
  };

  const selectedMode = form.watch('stopLoss.mode');

  return (
    <FormField
      control={form.control}
      name="stopLoss.mode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Stop Loss Strategy</FormLabel>
          <FormControl>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {modes.map((mode) => {
                const isSelected = selectedMode === mode.value;
                const Icon = mode.icon;
                
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => handleModeChange(mode.value)}
                    className={cn(
                      "relative flex flex-row items-center gap-3 p-3 rounded-lg border bg-card text-left transition-all",
                      "hover:border-primary/50 hover:shadow-sm",
                      isSelected 
                        ? "border-primary bg-primary/5 shadow-sm" 
                        : "border-border"
                    )}
                  >
                    {/* Icon with gradient background */}
                    <div className={cn(
                      "h-10 w-10 shrink-0 rounded-lg flex items-center justify-center border transition-colors",
                      isSelected
                        ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/20"
                        : "bg-gradient-to-br from-muted/50 to-muted/30 border-border"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5 transition-colors",
                        isSelected ? "text-primary" : "text-muted-foreground"
                      )} />
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1 space-y-0.5 min-w-0">
                      <h3 className={cn(
                        "font-semibold text-sm",
                        isSelected ? "text-foreground" : "text-foreground"
                      )}>
                        {mode.label}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {mode.description}
                      </p>
                    </div>

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    )}
                  </button>
                );
              })}
            </div>
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
