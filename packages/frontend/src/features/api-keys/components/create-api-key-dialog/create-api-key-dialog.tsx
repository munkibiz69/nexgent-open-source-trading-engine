'use client';

/**
 * Create API Key Dialog
 * 
 * Dialog for creating a new API key with name and permission selection.
 * Uses tabs for "All" (full access) vs "Restricted" (granular permissions).
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { Loader2, ShieldCheck, Shield } from 'lucide-react';
import { useCreateApiKey } from '../../hooks/use-api-keys';
import { useToast } from '@/shared/hooks/use-toast';
import type { CreateApiKeyDialogProps } from '../../types/api-key.types';
import type { ApiKeyScope } from '@/infrastructure/api/services/api-keys.service';

/**
 * Available resource permissions for restricted access
 */
interface ResourcePermission {
  id: ApiKeyScope;
  name: string;
  description: string;
}

const RESOURCE_PERMISSIONS: ResourcePermission[] = [
  { id: 'signals', name: 'Signals', description: 'Read & write trading signals' },
  { id: 'agents', name: 'Agents', description: 'Read agent data & configuration' },
  { id: 'positions', name: 'Positions', description: 'Read open positions' },
  { id: 'balances', name: 'Balances', description: 'Read agent balances' },
  { id: 'transactions', name: 'Transactions', description: 'Read transaction history' },
  { id: 'history', name: 'History', description: 'Read historical swaps' },
];

type PermissionMode = 'all' | 'restricted';

export function CreateApiKeyDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateApiKeyDialogProps) {
  const { toast } = useToast();
  const { mutate: createApiKey, isPending } = useCreateApiKey();

  const [name, setName] = useState('');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('all');
  const [selectedScopes, setSelectedScopes] = useState<Set<ApiKeyScope>>(new Set());

  const toggleScope = (scope: ApiKeyScope) => {
    setSelectedScopes((prev) => {
      const next = new Set(prev);
      if (next.has(scope)) {
        next.delete(scope);
      } else {
        next.add(scope);
      }
      return next;
    });
  };

  const getScopes = (): ApiKeyScope[] => {
    if (permissionMode === 'all') {
      return ['full_access'];
    }
    return Array.from(selectedScopes);
  };

  const hasValidScopes = permissionMode === 'all' || selectedScopes.size > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: 'Name required',
        description: 'Please enter a name for your API key',
        variant: 'destructive',
      });
      return;
    }

    if (!hasValidScopes) {
      toast({
        title: 'Permission required',
        description: 'Please select at least one permission',
        variant: 'destructive',
      });
      return;
    }

    createApiKey(
      { name: name.trim(), scopes: getScopes() },
      {
        onSuccess: (data) => {
          toast({
            title: 'API key created',
            description: 'Your new API key has been created. Make sure to copy it now!',
          });
          resetForm();
          onOpenChange(false);
          onSuccess?.(data.key);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error.message || 'Failed to create API key',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const resetForm = () => {
    setName('');
    setPermissionMode('all');
    setSelectedScopes(new Set());
  };

  const handleClose = () => {
    if (!isPending) {
      resetForm();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create API Key</DialogTitle>
          <DialogDescription>
            Create a new API key for programmatic access. The key will only be shown once.
          </DialogDescription>
        </DialogHeader>
        <form id="create-api-key-form" onSubmit={handleSubmit}>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="api-key-name">Name</Label>
              <Input
                id="api-key-name"
                placeholder="e.g., Signal Engine Production"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isPending}
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground">
                A friendly name to identify this API key
              </p>
            </div>

            <div className="space-y-3">
              <Label>Permissions</Label>
              <Tabs
                value={permissionMode}
                onValueChange={(v) => setPermissionMode(v as PermissionMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="all" className="gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Full Access
                  </TabsTrigger>
                  <TabsTrigger value="restricted" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Restricted
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-4">
                  <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Full Access</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          This API key will have complete access to all API endpoints,
                          including reading and writing all resources.
                        </p>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="restricted" className="mt-4">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      Select which resources this API key can access (read-only except Signals)
                    </p>

                    <div className="rounded-lg border divide-y">
                      {RESOURCE_PERMISSIONS.map((resource) => (
                        <label
                          key={resource.id}
                          htmlFor={`scope-${resource.id}`}
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
                        >
                          <Checkbox
                            id={`scope-${resource.id}`}
                            checked={selectedScopes.has(resource.id)}
                            onCheckedChange={() => toggleScope(resource.id)}
                            disabled={isPending}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">{resource.name}</p>
                            <p className="text-xs text-muted-foreground">{resource.description}</p>
                          </div>
                        </label>
                      ))}
                    </div>

                    {permissionMode === 'restricted' && selectedScopes.size === 0 && (
                      <p className="text-xs text-amber-500">
                        Select at least one permission to create the API key
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="create-api-key-form"
            disabled={isPending || !name.trim() || !hasValidScopes}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create API Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
