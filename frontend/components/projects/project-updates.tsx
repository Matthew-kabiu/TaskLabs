'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Loader2, MessageSquarePlus, Send, Trash2 } from 'lucide-react';
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
    <div className="grid gap-3 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
      <div className="flex h-fit flex-col gap-3 rounded-xl border border-border/60 bg-card/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" /> New update
        </div>
        <textarea
          aria-label="Post a project update"
          className="min-h-28 resize-y rounded-lg border border-border/60 bg-background px-3 py-2 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground focus:border-foreground/40 focus:ring-2 focus:ring-ring/30"
          placeholder="Post an update to the project board…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={2000}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">{body.trim().length}/2000</span>
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
              <><Send className="mr-1.5 h-4 w-4" /> Post update</>
            )}
          </Button>
        </div>
      </div>

      <div className="flex min-h-40 flex-col divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card/30">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Loading updates…
          </div>
        ) : (updates ?? []).length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground"><MessageSquarePlus className="h-4 w-4" /></span>
            <p className="text-sm font-medium">No updates yet</p>
            <p className="text-xs text-muted-foreground">Post the first progress note for this project.</p>
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
    </div>
  );
}
