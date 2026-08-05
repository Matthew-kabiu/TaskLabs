'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BACKEND_ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/datetime';
import {
  useAddProjectUpdate,
  useProjectUpdates,
  useRemoveProjectUpdate,
} from '@/hooks/useProjects';
import type { WorkspaceMemberDTO } from '@/hooks/useWorkspaces';

interface Props {
  projectId: string;
  workspaceId: string;
  members: WorkspaceMemberDTO[];
}

function memberMeta(members: WorkspaceMemberDTO[], authorId: string) {
  const member = members.find((m) => m.id === authorId);
  const label = member?.name ?? member?.email ?? 'Unknown';
  return { label, initial: label.slice(0, 2).toUpperCase() };
}

export function ProjectUpdates({ projectId, workspaceId, members }: Props) {
  const [body, setBody] = React.useState('');
  const { data: updates, isLoading } = useProjectUpdates(projectId, workspaceId);
  const addUpdate = useAddProjectUpdate(workspaceId);
  const removeUpdate = useRemoveProjectUpdate(workspaceId);
  const profile = useQuery(BACKEND_ROUTES.profile.get, {}) as
    | { id: string }
    | undefined;

  const handlePost = async () => {
    if (body.trim().length < 1) return;
    try {
      await addUpdate.mutateAsync({ projectId, input: { body } });
      setBody('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRemove = async (updateId: string) => {
    try {
      await removeUpdate.mutateAsync({ projectId, updateId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        <textarea
          aria-label="Post a project update"
          className="min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
          placeholder="Post an update to the project board…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handlePost}
            disabled={addUpdate.isPending || body.trim().length < 1}
          >
            {addUpdate.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Posting…
              </>
            ) : (
              'Post update'
            )}
          </Button>
        </div>
      </div>

      <div className="flex flex-col divide-y rounded-lg border bg-card">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading updates…
          </div>
        ) : (updates ?? []).length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            No updates yet. Post the first one above.
          </div>
        ) : (
          (updates ?? []).map((update) => {
            const meta = memberMeta(members, update.authorId);
            const canDelete = update.authorId === profile?.id;
            return (
              <div key={update.id} className="flex gap-3 p-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
                  {meta.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{meta.label}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {formatDateTime(update.createdAt, 'datetime')}
                    </span>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{update.body}</p>
                </div>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-rose-500"
                    onClick={() => handleRemove(update.id)}
                    disabled={removeUpdate.isPending}
                    aria-label="Delete update"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
