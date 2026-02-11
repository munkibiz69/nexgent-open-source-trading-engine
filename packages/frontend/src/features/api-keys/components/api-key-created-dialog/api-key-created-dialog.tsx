'use client';

/**
 * API Key Created Dialog
 * 
 * Shows the newly created API key (only displayed once) with copy functionality.
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
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Copy, CheckCircle2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import type { ApiKeyCreatedDialogProps } from '../../types/api-key.types';

export function ApiKeyCreatedDialog({
  open,
  onOpenChange,
  apiKey,
  name,
}: ApiKeyCreatedDialogProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      toast({
        title: 'Copied',
        description: 'API key copied to clipboard',
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: 'Failed to copy',
        description: 'Please select and copy the key manually',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            API Key Created
          </DialogTitle>
          <DialogDescription>
            Your API key &quot;{name}&quot; has been created successfully.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <Alert className="bg-amber-500/10 border-amber-500/20">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <AlertDescription className="text-amber-600 dark:text-amber-400">
              <strong>Important:</strong> This key will only be displayed once. Copy it now and store it securely.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono bg-muted p-3 rounded border break-all select-all">
                {apiKey}
              </code>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Use this key in the <code className="bg-muted px-1 rounded">X-API-Key</code> header or as a Bearer token.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleClose}>
            {copied ? 'Done' : 'I\'ve copied my key'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
