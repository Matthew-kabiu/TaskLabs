// app/(app)/settings/workspace/rename-form.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BACKEND_ROUTES } from '@/lib/routes';

export function RenameForm(props: {
  workspaceId: string;
  initialName: string;
  isPersonal: boolean;
}) {
  const router = useRouter();
  const updateWorkspace = useMutation(BACKEND_ROUTES.workspaces.update);
  const [name, setName] = useState(props.initialName);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setOk(false);
    try {
      await updateWorkspace({
        workspaceId: props.workspaceId as Id<'workspaces'>,
        name,
      });
      setOk(true);
      router.refresh();
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-3">
      <div className="space-y-2">
        <Label htmlFor="ws-name">Workspace name</Label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          maxLength={80}
        />
        {props.isPersonal && (
          <p className="text-xs text-muted-foreground">
            This is your personal workspace.
          </p>
        )}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {ok && <p className="text-sm text-emerald-600">Saved.</p>}
      <Button
        type="submit"
        disabled={busy || name === props.initialName}
        className="self-start"
      >
        {busy ? 'Saving…' : 'Save'}
      </Button>
    </form>
  );
}
