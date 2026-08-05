'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  useQuery,
  useMutation as useConvexMutation,
} from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import type {
  CreateTaskInput,
  ListTasksQuery,
  ReorderTasksInput,
  UpdateTaskInput,
} from '@/lib/validations/task.schema';
export type TaskListFilters = Partial<ListTasksQuery> & {
  projectId?: string | null;
};
import { useWorkspaces } from '@/hooks/useWorkspaces';
import type { Priority, TaskStatus } from '@/lib/tasks/grouping';
import { BACKEND_ROUTES } from '@/lib/routes';

export interface TaskDTO {
  id: string;
  number: number;
  workspaceId: string;
  creatorId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  completedAt: string | null;
  isPrivate: boolean;
  position: number;
  projectId: string | null;
  assignees: {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
  }[];
  labels: { id: string; name: string; color: string }[];
  createdAt: string;
  updatedAt: string;
}

type MutationResult<TResult, TVariables> = {
  mutateAsync: (variables: TVariables) => Promise<TResult>;
  mutate: (variables: TVariables) => void;
  isPending: boolean;
};

type TaskQueryResult = {
  data: TaskDTO[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

type CreateTaskVariables = Omit<
  CreateTaskInput,
  'assigneeIds' | 'labelIds' | 'projectId'
> & {
  assigneeIds?: string[];
  labelIds?: string[];
  projectId?: string | null;
};

type TaskPatch = Partial<
  Omit<UpdateTaskInput, 'dueDate' | 'completedAt'> & {
    dueDate: Date | string | null;
    completedAt: Date | string | null;
    projectId?: string | null;
  }
>;

function taskListArgs(workspaceId: string, filters: TaskListFilters) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    status: filters.status,
    priority: filters.priority,
    q: filters.q,
    sort: filters.sort && filters.sort !== 'manual' ? filters.sort : undefined,
    dueFrom: filters.dueFrom,
    dueTo: filters.dueTo,
    projectId: filters.projectId
      ? (filters.projectId as Id<'projects'>)
      : filters.projectId === null
        ? null
        : undefined,
  };
}

function dateArg(value: Date | string | number | null | undefined) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function optionalDateArg(value: Date | string | number | null | undefined) {
  const next = dateArg(value);
  return next === null ? undefined : next;
}

function createArgs(workspaceId: string, input: CreateTaskVariables) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: optionalDateArg(input.dueDate),
    isPrivate: input.isPrivate,
    projectId: input.projectId ? (input.projectId as Id<'projects'>) : undefined,
    assigneeIds: input.assigneeIds?.map((id) => id as Id<'users'>),
    labelIds: input.labelIds?.map((id) => id as Id<'labels'>),
  };
}

function updateArgs(
  workspaceId: string,
  taskId: string,
  input: TaskPatch,
) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    taskId: taskId as Id<'tasks'>,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    dueDate: dateArg(input.dueDate),
    completedAt: dateArg(input.completedAt),
    isPrivate: input.isPrivate,
    position: input.position,
    projectId:
      input.projectId === undefined
        ? undefined
        : input.projectId === null
          ? null
          : (input.projectId as Id<'projects'>),
    assigneeIds: input.assigneeIds?.map((id) => id as Id<'users'>),
    labelIds: input.labelIds?.map((id) => id as Id<'labels'>),
  };
}

export function useTasks(
  filters: TaskListFilters = {},
  workspaceIdArg?: string | null,
): TaskQueryResult {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const queryArgs = useMemo(
    () => (workspaceId ? taskListArgs(workspaceId, filters) : 'skip'),
    [filters, workspaceId],
  );
  const data = useQuery(BACKEND_ROUTES.tasks.list, queryArgs) as TaskDTO[] | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId) && data === undefined,
    isError: false,
    error: null,
  };
}

function usePendingMutation<TResult, TVariables>(
  run: (variables: TVariables) => Promise<TResult>,
): MutationResult<TResult, TVariables> {
  const [isPending, setIsPending] = useState(false);
  const mutateAsync = useCallback(
    async (variables: TVariables) => {
      setIsPending(true);
      try {
        return await run(variables);
      } finally {
        setIsPending(false);
      }
    },
    [run],
  );
  const mutate = useCallback(
    (variables: TVariables) => {
      void mutateAsync(variables);
    },
    [mutateAsync],
  );
  return { mutateAsync, mutate, isPending };
}

export function useCreateTask(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const createTask = useConvexMutation(BACKEND_ROUTES.tasks.create);
  return usePendingMutation<TaskDTO, CreateTaskVariables>(
    useCallback(
      async (input) => {
        if (!workspaceId) throw new Error('Select a workspace before creating tasks.');
        return (await createTask(createArgs(workspaceId, input))) as TaskDTO;
      },
      [createTask, workspaceId],
    ),
  );
}

export function useUpdateTask(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const updateTask = useConvexMutation(BACKEND_ROUTES.tasks.update);
  return usePendingMutation<TaskDTO, { id: string; input: TaskPatch }>(
    useCallback(
      async ({ id, input }) => {
        if (!workspaceId) throw new Error('Select a workspace before updating tasks.');
        return (await updateTask(updateArgs(workspaceId, id, input))) as TaskDTO;
      },
      [updateTask, workspaceId],
    ),
  );
}

export function useDeleteTask(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeTask = useConvexMutation(BACKEND_ROUTES.tasks.remove);
  return usePendingMutation<void, string>(
    useCallback(
      async (id) => {
        if (!workspaceId) throw new Error('Select a workspace before deleting tasks.');
        await removeTask({
          workspaceId: workspaceId as Id<'workspaces'>,
          taskId: id as Id<'tasks'>,
        });
      },
      [removeTask, workspaceId],
    ),
  );
}

export function useDeleteTasks(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeTasks = useConvexMutation(BACKEND_ROUTES.tasks.removeMany);
  return usePendingMutation<{ deleted: number }, string[]>(
    useCallback(
      async (ids) => {
        if (!workspaceId) throw new Error('Select a workspace before deleting tasks.');
        return (await removeTasks({
          workspaceId: workspaceId as Id<'workspaces'>,
          taskIds: ids.map((id) => id as Id<'tasks'>),
        })) as { deleted: number };
      },
      [removeTasks, workspaceId],
    ),
  );
}

export function useReorderTasks(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const reorderTasks = useConvexMutation(BACKEND_ROUTES.tasks.reorder);
  return usePendingMutation<{ ok: boolean }, ReorderTasksInput>(
    useCallback(
      async (input) => {
        if (!workspaceId) throw new Error('Select a workspace before reordering tasks.');
        return (await reorderTasks({
          workspaceId: workspaceId as Id<'workspaces'>,
          items: input.items.map((item) => ({
            id: item.id as Id<'tasks'>,
            position: item.position,
          })),
        })) as { ok: boolean };
      },
      [reorderTasks, workspaceId],
    ),
  );
}

export function useTasksInRange(from: Date, to: Date, workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const data = useQuery(
    BACKEND_ROUTES.tasks.list,
    workspaceId
      ? {
          workspaceId: workspaceId as Id<'workspaces'>,
          dueFrom: from.toISOString(),
          dueTo: to.toISOString(),
        }
      : 'skip',
  ) as TaskDTO[] | undefined;

  return {
    data: data?.filter((task) => task.dueDate !== null),
    isLoading: Boolean(workspaceId) && data === undefined,
  };
}
