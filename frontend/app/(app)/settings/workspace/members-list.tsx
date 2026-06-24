// app/(app)/settings/workspace/members-list.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import { BACKEND_ROUTES } from '@/lib/routes';

type Member = {
  id: string;
  email: string;
  name: string | null;
  joinedAt: string;
};

export function MembersList(props: {
  workspaceId: string;
  currentUserId: string;
  isPersonal: boolean;
  members: Member[];
}) {
  const router = useRouter();
  const removeMember = useMutation(BACKEND_ROUTES.workspaces.removeMember);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function remove(userId: string) {
    setBusyId(userId); setErr(null);
    try {
      await removeMember({
        workspaceId: props.workspaceId as Id<'workspaces'>,
        userId: userId as Id<'users'>,
      });
      router.refresh();
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-sm text-destructive">{err}</p>}
      <ul className="divide-y rounded border">
        {props.members.map((m) => (
          <li key={m.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium">{m.name ?? m.email}</p>
              <p className="text-xs text-muted-foreground">{m.email}</p>
            </div>
            {!props.isPersonal && (
              <Button
                variant="ghost"
                size="sm"
                disabled={busyId === m.id}
                onClick={() => remove(m.id)}
              >
                {m.id === props.currentUserId ? 'Leave' : 'Remove'}
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
