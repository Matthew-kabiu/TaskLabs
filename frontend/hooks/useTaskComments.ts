'use client';

import { useCallback } from 'react';
import {
  useMutation as useConvexMutation,
  useQuery,
} from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import type { CreateTaskCommentInput } from '@/lib/validations/task-comment.schema';
import { usePendingMutation } from '@/hooks/usePendingMutation';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { BACKEND_ROUTES } from '@/lib/routes';

export interface TaskCommentDTO {
  id: string;
  taskId: string;
  authorId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

export function useTaskComments(
  taskId?: string | null,
  workspaceIdArg?: string | null,
) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const data = useQuery(
    BACKEND_ROUTES.taskComments.list,
    workspaceId && taskId
      ? {
          workspaceId: workspaceId as Id<'workspaces'>,
          taskId: taskId as Id<'tasks'>,
        }
      : 'skip',
  ) as TaskCommentDTO[] | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId && taskId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useAddTaskComment(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const addComment = useConvexMutation(BACKEND_ROUTES.taskComments.create);
  return usePendingMutation<
    TaskCommentDTO,
    { taskId: string; input: CreateTaskCommentInput }
  >(
    useCallback(
      async ({ taskId, input }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before commenting on tasks.');
        }
        return (await addComment({
          workspaceId: workspaceId as Id<'workspaces'>,
          taskId: taskId as Id<'tasks'>,
          body: input.body,
        })) as TaskCommentDTO;
      },
      [addComment, workspaceId],
    ),
  );
}

export function useUpdateTaskComment(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const updateComment = useConvexMutation(BACKEND_ROUTES.taskComments.update);
  return usePendingMutation<
    TaskCommentDTO,
    { taskId: string; commentId: string; input: CreateTaskCommentInput }
  >(
    useCallback(
      async ({ taskId, commentId, input }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before editing task comments.');
        }
        return (await updateComment({
          workspaceId: workspaceId as Id<'workspaces'>,
          taskId: taskId as Id<'tasks'>,
          commentId: commentId as Id<'taskComments'>,
          body: input.body,
        })) as TaskCommentDTO;
      },
      [updateComment, workspaceId],
    ),
  );
}

export function useRemoveTaskComment(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeComment = useConvexMutation(BACKEND_ROUTES.taskComments.remove);
  return usePendingMutation<
    void,
    { taskId: string; commentId: string }
  >(
    useCallback(
      async ({ taskId, commentId }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before deleting task comments.');
        }
        await removeComment({
          workspaceId: workspaceId as Id<'workspaces'>,
          taskId: taskId as Id<'tasks'>,
          commentId: commentId as Id<'taskComments'>,
        });
      },
      [removeComment, workspaceId],
    ),
  );
}
