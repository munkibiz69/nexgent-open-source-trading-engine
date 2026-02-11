/**
 * API Key feature types
 * 
 * Type definitions specific to the api-keys feature module.
 */

import type { ApiKeyScope } from '@/infrastructure/api/services/api-keys.service';

/**
 * Props for create API key dialog
 */
export interface CreateApiKeyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (key: string) => void;
}

/**
 * Props for API key card (internal component)
 */
export interface ApiKeyCardProps {
  id: string;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
}

/**
 * Props for API key list
 */
export interface ApiKeyListProps {
  onCreateClick: () => void;
}

/**
 * Props for API key created dialog (shows the key once)
 */
export interface ApiKeyCreatedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  apiKey: string;
  name: string;
}
