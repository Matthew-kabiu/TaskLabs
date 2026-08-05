// app/(app)/settings/workspace/rename-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BACKEND_ROUTES } from '@/lib/routes';

export function RenameForm(props: {
  workspaceId: string;
  initialName: string;
  isPersonal: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const updateWorkspace = useMutation(BACKEND_ROUTES.workspaces.update);
  const [name, setName] = useState(props.initialName);
  const [busy, setBusy] = useState(false);
  const [syncedWorkspaceId, setSyncedWorkspaceId] = useState(props.workspaceId);

  if (syncedWorkspaceId !== props.workspaceId) {
    setSyncedWorkspaceId(props.workspaceId);
    setName(props.initialName);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!props.canEdit) return;
    setBusy(true);
    try {
      await updateWorkspace({
        workspaceId: props.workspaceId as Id<'workspaces'>,
        name,
      });
      toast.success('Workspace name updated');
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Could not update workspace');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
          disabled={!props.canEdit}
        />
        {props.isPersonal && (
          <p className="text-xs text-muted-foreground">
            This is your personal workspace.
          </p>
        )}
      </div>
      {!props.canEdit ? (
        <p className="text-xs text-muted-foreground">Only workspace admins and owners can rename this workspace.</p>
      ) : null}
      <Button
        type="submit"
        disabled={!props.canEdit || busy || name === props.initialName}
        className="self-start"
      >
        <Save className="h-4 w-4" />
        {busy ? 'Saving…' : 'Save changes'}
      </Button>
    </form>
  );
}
