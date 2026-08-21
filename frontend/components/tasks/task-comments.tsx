'use client';

import * as React from 'react';
import { useQuery } from 'convex/react';
import { toast } from 'sonner';
import {
  Check,
  Loader2,
  MessageSquarePlus,
  PencilLine,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MarkdownContent } from '@/components/markdown/markdown-content';
import { MarkdownEditor } from '@/components/markdown/markdown-editor';
import { BACKEND_ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/datetime';
import {
  useAddTaskComment,
  useRemoveTaskComment,
  useTaskComments,
  useUpdateTaskComment,
} from '@/hooks/useTaskComments';

interface CommentMemberDTO {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  taskId: string;
  workspaceId?: string | null;
  members: CommentMemberDTO[];
}

function memberMeta(members: CommentMemberDTO[], authorId: string) {
  const member = members.find((m) => m.id === authorId);
  const label = member?.name ?? member?.email ?? 'Unknown';
  return { label, initial: label.slice(0, 2).toUpperCase() };
}

export function TaskComments({ taskId, workspaceId, members }: Props) {
  const [body, setBody] = React.useState('');
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editBody, setEditBody] = React.useState('');
  const { data: comments, isLoading } = useTaskComments(taskId, workspaceId);
  const addComment = useAddTaskComment(workspaceId);
  const updateComment = useUpdateTaskComment(workspaceId);
  const removeComment = useRemoveTaskComment(workspaceId);
  const profile = useQuery(BACKEND_ROUTES.profile.get, {}) as
    | { id: string }
    | undefined;

  const handlePost = async () => {
    if (body.trim().length < 1) return;
    try {
      await addComment.mutateAsync({ taskId, input: { body } });
      setBody('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleUpdate = async (commentId: string) => {
    if (editBody.trim().length < 1) return;
    try {
      await updateComment.mutateAsync({
        taskId,
        commentId,
        input: { body: editBody },
      });
      setEditingId(null);
      setEditBody('');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleRemove = async (commentId: string) => {
    try {
      await removeComment.mutateAsync({ taskId, commentId });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const renderComment = (comment: NonNullable<typeof comments>[number]) => {
    const meta = memberMeta(members, comment.authorId);
    const canManage = comment.authorId === profile?.id;
    if (editingId === comment.id) {
      return (
        <div key={comment.id} className="flex flex-col gap-2 p-4">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="text-[11px] text-muted-foreground">editing</span>
          </div>
          <MarkdownEditor
            ariaLabel="Edit task comment"
            placeholder="Update your comment…"
            value={editBody}
            onChange={setEditBody}
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setEditBody('');
              }}
            >
              <X className="mr-1 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => handleUpdate(comment.id)}
              disabled={
                updateComment.isPending || editBody.trim().length < 1
              }
            >
              {updateComment.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-3.5 w-3.5" /> Save
                </>
              )}
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div key={comment.id} className="flex gap-3 p-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">
          {meta.initial}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-sm font-medium">{meta.label}</span>
            <span className="text-[11px] text-muted-foreground">
              {formatDateTime(comment.createdAt, 'datetime')}
              {comment.editedAt ? ' (edited)' : ''}
            </span>
          </div>
          <MarkdownContent className="mt-2">{comment.body}</MarkdownContent>
        </div>
        {canManage ? (
          <div className="flex shrink-0 items-start gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              onClick={() => {
                setEditingId(comment.id);
                setEditBody(comment.body);
              }}
              disabled={removeComment.isPending}
              aria-label="Edit comment"
            >
              <PencilLine className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => handleRemove(comment.id)}
              disabled={removeComment.isPending}
              aria-label="Delete comment"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border/60">
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-2.5 text-sm font-medium">
        <MessageSquarePlus className="h-4 w-4 text-muted-foreground" />
        Comments
        {comments?.length ? (
          <span className="text-xs font-normal text-muted-foreground">
            ({comments.length})
          </span>
        ) : null}
      </div>

      <div className="px-4 pb-1">
        <MarkdownEditor
          ariaLabel="Write a task comment"
          placeholder="Add an implementation note, decision, or status update…"
          value={body}
          onChange={setBody}
        />
        <div className="mt-2 flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handlePost}
            disabled={addComment.isPending || body.trim().length < 1}
          >
            {addComment.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Posting…
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" /> Comment
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="flex max-h-72 flex-col divide-y divide-border/60 overflow-y-auto border-t border-border/60">
        {isLoading ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Loading comments…
          </div>
        ) : (comments ?? []).length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm font-medium">No comments yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Notes added here travel with the task across every board column.
            </p>
          </div>
        ) : (
          (comments ?? []).map(renderComment)
        )}
      </div>
    </div>
  );
}
