'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Plus } from 'lucide-react';
import { DataSourceConnections } from '@/features/integrations';
import {
  CreateApiKeyDialog,
  ApiKeyCreatedDialog,
  ApiKeyList,
} from '@/features/api-keys';

export default function IntegrationsPage() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createdKeyDialogOpen, setCreatedKeyDialogOpen] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ key: string; name: string } | null>(null);

  const handleKeyCreated = (key: string) => {
    setNewlyCreatedKey({ key, name: 'New API Key' });
    setCreatedKeyDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-4 px-4 py-6">
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl font-bold">Integrations</CardTitle>
                <CardDescription className="text-muted-foreground max-w-[800px]">
                  Monitor and manage your data source connections and integrations.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API Keys Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">API Keys</CardTitle>
                    <CardDescription>
                      Create and manage API keys for programmatic access to your trading engine.
                    </CardDescription>
                  </div>
                  <Button size="sm" onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Key
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ApiKeyList onCreateClick={() => setCreateDialogOpen(true)} />
              </CardContent>
            </Card>

            <DataSourceConnections />
          </CardContent>
        </Card>
      </div>

      <CreateApiKeyDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleKeyCreated}
      />

      {newlyCreatedKey && (
        <ApiKeyCreatedDialog
          open={createdKeyDialogOpen}
          onOpenChange={setCreatedKeyDialogOpen}
          apiKey={newlyCreatedKey.key}
          name={newlyCreatedKey.name}
        />
      )}
    </div>
  );
}
