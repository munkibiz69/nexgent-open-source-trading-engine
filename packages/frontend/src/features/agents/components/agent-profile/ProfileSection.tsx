'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import { Copy, Check, AlertCircle } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useUpdateAgent } from '@/features/agents';
import { useUnsavedChanges } from '@/features/agents/contexts/unsaved-changes.context';
import { LoadingSpinner } from '@/shared/components';
import type { Agent } from '@/shared/types/api.types';

const profileSchema = z.object({
  name: z
    .string()
    .min(1, 'Agent name is required')
    .max(255, 'Agent name must be less than 255 characters'),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileSectionProps {
  agent: Agent;
}

const FORM_ID = 'profile';

/**
 * Profile Section Component
 *
 * Simple form for editing agent name.
 * Uses explicit Save button; registers with UnsavedChangesContext for navigation guard.
 */
export function ProfileSection({ agent }: ProfileSectionProps) {
  const { toast } = useToast();
  const updateAgentMutation = useUpdateAgent();
  const unsavedContext = useUnsavedChanges();
  const [copied, setCopied] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: agent.name,
    },
  });

  const isDirty = form.formState.isDirty;
  const isValid = form.formState.isValid;

  // Sync default values when agent changes (e.g. agent switch)
  React.useEffect(() => {
    form.reset({ name: agent.name });
  }, [agent.id, agent.name, form]);

  // Register with unsaved changes context
  React.useEffect(() => {
    if (!unsavedContext) return;

    const save = async (): Promise<boolean> => {
      if (!form.formState.isDirty) return true;
      const valid = await form.trigger();
      if (!valid) return false;
      try {
        const data = form.getValues();
        await updateAgentMutation.mutateAsync({
          agentId: agent.id,
          data: { name: data.name },
        });
        form.reset(data, { keepValues: true });
        return true;
      } catch {
        return false;
      }
    };

    unsavedContext.registerForm(FORM_ID, {
      isDirty: () => form.formState.isDirty,
      save,
    });
    return () => unsavedContext.unregisterForm(FORM_ID);
  }, [unsavedContext, agent.id, form, updateAgentMutation]);

  // Report dirty state changes
  React.useEffect(() => {
    unsavedContext?.updateFormDirty(FORM_ID, isDirty);
  }, [unsavedContext, isDirty]);

  const handleSave = async () => {
    if (!isDirty || !isValid || updateAgentMutation.isPending) return;
    setSaveStatus('saving');
    try {
      const data = form.getValues();
      await updateAgentMutation.mutateAsync({
        agentId: agent.id,
        data: { name: data.name },
      });
      form.reset(data, { keepValues: true });
      setSaveStatus('saved');
      unsavedContext?.updateFormDirty(FORM_ID, false);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      setSaveStatus('error');
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description:
          error instanceof Error ? error.message : 'Failed to save agent profile. Please try again.',
      });
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  const handleCopyAgentId = async () => {
    try {
      await navigator.clipboard.writeText(agent.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Copy Failed',
        description: 'Failed to copy agent ID to clipboard.',
      });
    }
  };

  const isSaving = updateAgentMutation.isPending;
  const canSave = isDirty && isValid && !isSaving;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Agent Profile</CardTitle>
            <CardDescription>
              Manage your agent's basic information. Click <strong>Save Changes</strong> when done.
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            {canSave && (
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {saveStatus === 'saving' && <LoadingSpinner size="sm" className="mr-1" />}
                Save Changes
              </Button>
            )}
            {saveStatus === 'saved' && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <Check className="h-4 w-4" />
                <span>Saved</span>
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                <span>Save failed</span>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form id="profile-form" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Enter agent name"
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Agent ID</label>
                <div className="flex items-center gap-2">
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono flex-1">
                    {agent.id}
                  </code>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleCopyAgentId}
                    title="Copy Agent ID"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
