'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import {
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/shared/components/ui/form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { X, Plus, AlertCircle } from 'lucide-react';
import type { AgentTradingConfigFormValues } from './trading-config-form-schema';
import type { TokenFilterMode } from '@nexgent/shared';

interface TokenListEditorProps {
  mode: TokenFilterMode;
}

/**
 * Token List Editor Component
 * 
 * Manages a list of token addresses for blacklist/whitelist filtering.
 * Validates address length (32-44 characters for Solana addresses).
 */
export function TokenListEditor({ mode }: TokenListEditorProps) {
  const form = useFormContext<AgentTradingConfigFormValues>();
  const [newAddress, setNewAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tokenList = form.watch('signals.tokenList') || [];

  const validateAddress = (address: string): string | null => {
    const trimmed = address.trim();
    if (!trimmed) {
      return 'Please enter a token address';
    }
    if (trimmed.length < 32) {
      return 'Token address is too short (minimum 32 characters)';
    }
    if (trimmed.length > 44) {
      return 'Token address is too long (maximum 44 characters)';
    }
    if (tokenList.includes(trimmed)) {
      return 'This token address is already in the list';
    }
    return null;
  };

  const handleAddAddress = () => {
    const trimmed = newAddress.trim();
    const validationError = validateAddress(trimmed);
    
    if (validationError) {
      setError(validationError);
      return;
    }

    const newList = [...tokenList, trimmed];
    form.setValue('signals.tokenList', newList, { shouldDirty: true });
    setNewAddress('');
    setError(null);
  };

  const handleRemoveAddress = (addressToRemove: string) => {
    const newList = tokenList.filter((addr) => addr !== addressToRemove);
    form.setValue('signals.tokenList', newList, { shouldDirty: true });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAddress();
    }
  };

  const modeLabel = mode === 'whitelist' ? 'Whitelisted' : 'Blacklisted';

  return (
    <FormField
      control={form.control}
      name="signals.tokenList"
      render={() => (
        <FormItem>
          <FormLabel>{modeLabel} Token Addresses</FormLabel>
          <FormDescription>
            {mode === 'whitelist'
              ? 'Only signals for these tokens will trigger trades'
              : 'Signals for these tokens will be ignored'}
          </FormDescription>

          {/* Add new address input */}
          <div className="flex gap-2 mt-2">
            <div className="flex-1 space-y-1">
              <Input
                placeholder="Enter Solana token address..."
                value={newAddress}
                onChange={(e) => {
                  setNewAddress(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyDown}
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-sm text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </p>
              )}
            </div>
            <Button
              type="button"
              onClick={handleAddAddress}
              disabled={!newAddress.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Token list table */}
          {tokenList.length > 0 && (
            <div className="border rounded-md mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Token Address</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokenList.map((address, index) => (
                    <TableRow key={`${address}-${index}`}>
                      <TableCell className="font-mono text-sm">
                        <span className="break-all">{address}</span>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemoveAddress(address)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Remove {address}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {tokenList.length === 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              No tokens added yet. Add token addresses above.
            </p>
          )}

          <FormMessage />
        </FormItem>
      )}
    />
  );
}
