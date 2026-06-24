'use client';

/**
 * Re-exports from the canonical hooks module, adapting signatures to the
 * Kanban plan's expected API.
 *
 * The existing useUpdateTask uses `{ id, input }` while the Kanban board
 * uses `{ id, patch }`. We provide a thin wrapper here so the kanban
 * components import from a single well-known path.
 */

import {
  useUpdateTask as useBaseUpdateTask,
  type TaskDTO,
} from '@/hooks/useTasks';
import type { KanbanTask } from '@/components/tasks/kanban-card';

export type { TaskDTO };
export { useTasks } from '@/hooks/useTasks';
export { useReorderTasks } from '@/hooks/useTasks';

/**
 * Patch-style updateTask mutation.
 * Accepts `{ id, patch }` instead of the base hook's `{ id, input }`.
 */
export function useUpdateTask() {
  const updateTask = useBaseUpdateTask();
  return {
    ...updateTask,
    mutate: ({ id, patch }: { id: string; patch: Partial<KanbanTask> }) => {
      updateTask.mutate({ id, input: patch });
    },
    mutateAsync: ({ id, patch }: { id: string; patch: Partial<KanbanTask> }) =>
      updateTask.mutateAsync({ id, input: patch }),
  };
}
