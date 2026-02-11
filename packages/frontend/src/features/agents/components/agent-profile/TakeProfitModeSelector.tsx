'use client';

import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { useFormContext } from 'react-hook-form';
import { Zap, BarChart, Lock, Settings } from 'lucide-react';
import { cn } from '@/shared/utils/cn';
import { getTakeProfitLevelsForMode, getMoonBagForMode } from '@nexgent/shared';
import type { AgentTradingConfigFormValues } from './trading-config-form-schema';
import type { TakeProfitMode } from '@nexgent/shared';

/**
 * Take-Profit Mode Selector Component
 * 
 * Card-style button selector for choosing take-profit calculation mode.
 * Similar to DCAModeSelector and StopLossModeSelector.
 */
export function TakeProfitModeSelector() {
  const form = useFormContext<AgentTradingConfigFormValues>();

  const modes: Array<{
    value: TakeProfitMode;
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }> = [
    {
      value: 'aggressive',
      label: 'Aggressive',
      description: 'Early profit-taking',
      icon: Zap,
    },
    {
      value: 'moderate',
      label: 'Moderate',
      description: 'Balanced targets',
      icon: BarChart,
    },
    {
      value: 'conservative',
      label: 'Conservative',
      description: 'Higher targets',
      icon: Lock,
    },
    {
      value: 'custom',
      label: 'Custom',
      description: 'Define your own',
      icon: Settings,
    },
  ];

  const handleModeChange = (newMode: TakeProfitMode) => {
    form.setValue('takeProfit.mode', newMode, { shouldDirty: true, shouldValidate: true });
    
    // If switching to custom mode and no levels exist, initialize with moderate defaults
    if (newMode === 'custom') {
      const currentLevels = form.getValues('takeProfit.levels');
      if (!currentLevels || currentLevels.length === 0) {
        // Initialize with moderate template as starting point
        form.setValue(
          'takeProfit.levels',
          getTakeProfitLevelsForMode('moderate'),
          { shouldDirty: true }
        );
        // Also set moon bag to moderate defaults
        form.setValue(
          'takeProfit.moonBag',
          getMoonBagForMode('moderate'),
          { shouldDirty: true }
        );
      }
    } else {
      // For preset modes, update moon bag to match the template
      form.setValue(
        'takeProfit.moonBag',
        getMoonBagForMode(newMode),
        { shouldDirty: true }
      );
    }
  };

  const selectedMode = form.watch('takeProfit.mode');

  return (
    <FormField
      control={form.control}
      name="takeProfit.mode"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Take-Profit Strategy</FormLabel>
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
