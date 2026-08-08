'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import { Loader2, MessageSquarePlus, PencilLine, Send, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';
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
  mode?: 'overview' | 'activity';
  onRequestUpdate?: () => void;
}

function memberMeta(members: WorkspaceMemberDTO[], authorId: string) {
  const member = members.find((m) => m.id === authorId);
  const label = member?.name ?? member?.email ?? 'Unknown';
  return { label, initial: label.slice(0, 2).toUpperCase() };
}

export function ProjectUpdates({
  projectId,
  workspaceId,
  members,
  mode = 'activity',
  onRequestUpdate,
}: Props) {
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

  const renderUpdate = (update: NonNullable<typeof updates>[number]) => {
    const meta = memberMeta(members, update.authorId);
    const canDelete = update.authorId === profile?.id;
    return (
      <div key={update.id} className="flex gap-3 p-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
          {meta.initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatDateTime(update.createdAt, 'datetime')}
            </span>
          </div>
          <MarkdownContent className="mt-2">{update.body}</MarkdownContent>
        </div>
        {canDelete ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            onClick={() => handleRemove(update.id)}
            disabled={removeUpdate.isPending}
            aria-label="Delete update"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
    );
  };

  if (mode === 'overview') {
    const latestUpdate = updates?.[0];
    return (
      <div className="overflow-hidden rounded-md border border-border/60">
        <div className="flex h-10 items-center justify-between border-b border-border/60 px-3">
          <span className="text-xs font-medium text-muted-foreground">Latest update</span>
          <Button type="button" variant="ghost" size="sm" onClick={onRequestUpdate}>
            <PencilLine className="mr-1.5 h-3.5 w-3.5" /> Update
          </Button>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Loading update…</div>
        ) : latestUpdate ? (
          renderUpdate(latestUpdate)
        ) : (
          <div className="flex min-h-32 flex-col items-center justify-center gap-2 p-6 text-center">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground">
              <MessageSquarePlus className="h-3.5 w-3.5" />
            </span>
            <p className="text-sm font-medium">No updates yet</p>
            <p className="text-xs text-muted-foreground">Share the first progress note for this project.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(18rem,0.7fr)_minmax(0,1.3fr)]">
      <div className="flex h-fit flex-col gap-3 rounded-md border border-border/60 p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquarePlus className="h-4 w-4 text-muted-foreground" /> New update
        </div>
        <MarkdownEditor
          ariaLabel="Post a project update"
          placeholder="Share progress, decisions, or blockers…"
          value={body}
          onChange={setBody}
        />
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground">Updates appear in project activity.</span>
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

      <div className="flex min-h-40 flex-col divide-y divide-border/60 overflow-hidden rounded-md border border-border/60">
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
          (updates ?? []).map(renderUpdate)
        )}
      </div>
    </div>
  );
}
