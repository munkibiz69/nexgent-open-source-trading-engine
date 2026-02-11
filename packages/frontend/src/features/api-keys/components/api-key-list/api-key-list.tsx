'use client';

/**
 * API Key List
 * 
 * Displays a list of all API keys for the current user.
 */

import { Button } from '@/shared/components/ui/button';
import { LoadingSpinner } from '@/shared/components';
import { Plus, Key } from 'lucide-react';
import { useApiKeys } from '../../hooks/use-api-keys';
import { ApiKeyCard } from '../api-key-card/api-key-card';
import type { ApiKeyListProps } from '../../types/api-key.types';

export function ApiKeyList({ onCreateClick }: ApiKeyListProps) {
  const { data: apiKeys, isLoading, error } = useApiKeys();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="md" text="Loading API keys..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center">
        <p className="text-destructive text-sm">Failed to load API keys: {error.message}</p>
      </div>
    );
  }

  if (!apiKeys || apiKeys.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Key className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-1">No API keys</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Create an API key to integrate external applications with your trading engine.
        </p>
        <Button onClick={onCreateClick}>
          <Plus className="mr-2 h-4 w-4" />
          Create API Key
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {apiKeys.map((apiKey) => (
        <ApiKeyCard
          key={apiKey.id}
          id={apiKey.id}
          name={apiKey.name}
          prefix={apiKey.prefix}
          scopes={apiKey.scopes}
          createdAt={apiKey.createdAt}
        />
      ))}
    </div>
  );
}
