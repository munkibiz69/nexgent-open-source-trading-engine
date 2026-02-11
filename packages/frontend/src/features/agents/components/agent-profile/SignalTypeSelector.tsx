'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { X, Plus } from 'lucide-react';
import { COMMON_SIGNAL_TYPES } from '@nexgent/shared';
import type { AgentTradingConfigFormValues } from './trading-config-form-schema';

const OTHER_OPTION = '__other__';

/**
 * Signal Type Selector Component
 * 
 * Allows users to select which signal types their agent should respond to.
 * Provides a dropdown with common types and an "Other" option for custom input.
 */
export function SignalTypeSelector() {
  const form = useFormContext<AgentTradingConfigFormValues>();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [customType, setCustomType] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const allowedTypes = form.watch('signals.allowedSignalTypes') || [];

  const handleAddType = (type: string) => {
    if (!type || allowedTypes.includes(type)) return;
    
    const newTypes = [...allowedTypes, type];
    form.setValue('signals.allowedSignalTypes', newTypes, { shouldDirty: true });
    setSelectedOption('');
    setCustomType('');
    setShowCustomInput(false);
  };

  const handleRemoveType = (typeToRemove: string) => {
    const newTypes = allowedTypes.filter((t) => t !== typeToRemove);
    form.setValue('signals.allowedSignalTypes', newTypes, { shouldDirty: true });
  };

  const handleSelectChange = (value: string) => {
    if (value === OTHER_OPTION) {
      setShowCustomInput(true);
      setSelectedOption('');
    } else {
      handleAddType(value);
    }
  };

  const handleCustomSubmit = () => {
    const trimmed = customType.trim();
    if (trimmed) {
      handleAddType(trimmed);
    }
  };

  // Filter out types that are already selected
  const availableTypes = COMMON_SIGNAL_TYPES.filter(
    (type) => !allowedTypes.includes(type)
  );

  return (
    <FormField
      control={form.control}
      name="signals.allowedSignalTypes"
      render={() => (
        <FormItem>
          <FormLabel>Allowed Signal Types</FormLabel>
          
          {/* Selected types as badges */}
          {allowedTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {allowedTypes.map((type) => (
                <Badge
                  key={type}
                  variant="secondary"
                  className="pl-3 pr-1 py-1 text-sm"
                >
                  {type}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 ml-1 hover:bg-destructive/20 rounded-full"
                    onClick={() => handleRemoveType(type)}
                  >
                    <X className="h-3 w-3" />
                    <span className="sr-only">Remove {type}</span>
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          {/* Add type dropdown or custom input */}
          <div className="flex gap-2">
            {showCustomInput ? (
              <>
                <Input
                  placeholder="Enter custom signal type..."
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCustomSubmit();
                    }
                    if (e.key === 'Escape') {
                      setShowCustomInput(false);
                      setCustomType('');
                    }
                  }}
                  className="flex-1"
                  autoFocus
                />
                <Button
                  type="button"
                  onClick={handleCustomSubmit}
                  disabled={!customType.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowCustomInput(false);
                    setCustomType('');
                  }}
                >
                  Cancel
                </Button>
              </>
            ) : (
              <Select value={selectedOption} onValueChange={handleSelectChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Add signal type..." />
                </SelectTrigger>
                <SelectContent>
                  {availableTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_OPTION}>
                    <span className="text-muted-foreground">Other (custom)...</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
