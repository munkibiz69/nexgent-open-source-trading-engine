'use client';

/**
 * API Key Card
 * 
 * Displays a single API key with its details and delete action.
 */

import { useState } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog';
import { Key, Trash2, Loader2, Calendar, Shield } from 'lucide-react';
import { useDeleteApiKey } from '../../hooks/use-api-keys';
import { useToast } from '@/shared/hooks/use-toast';
import type { ApiKeyCardProps } from '../../types/api-key.types';

const SCOPE_LABELS: Record<string, string> = {
  signals: 'Signals',
  agents: 'Agents',
  positions: 'Positions',
  balances: 'Balances',
  transactions: 'Transactions',
  history: 'History',
  full_access: 'Full Access',
};

export function ApiKeyCard({
  id,
  name,
  prefix,
  scopes,
  createdAt,
}: ApiKeyCardProps) {
  const { toast } = useToast();
  const { mutate: deleteApiKey, isPending } = useDeleteApiKey();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    deleteApiKey(id, {
      onSuccess: () => {
        toast({
          title: 'API key deleted',
          description: 'The API key has been permanently revoked',
        });
        setShowDeleteDialog(false);
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete API key',
          variant: 'destructive',
        });
      },
    });
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <>
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/20 shrink-0">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 space-y-1">
              <h3 className="font-semibold text-sm truncate">{name}</h3>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono">{prefix}...</code>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            <span>Permission:</span>
            <div className="flex gap-1">
              {scopes.map((scope) => (
                <Badge
                  key={scope}
                  variant="secondary"
                  className="text-xs px-1.5 py-0"
                >
                  {SCOPE_LABELS[scope] || scope}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            <span>Created {formattedDate}</span>
          </div>
        </div>
      </div>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{name}&quot;? This action cannot be undone and any applications using this key will immediately lose access.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
