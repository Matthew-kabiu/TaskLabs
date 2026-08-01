'use client';

import { useEffect, useMemo } from 'react';
import {
  DndContext,
  KeyboardSensor,
  MeasuringStrategy,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTasks, useUpdateTask, useReorderTasks } from '@/lib/hooks/use-tasks';
import {
  COLUMN_ORDER,
  bindKanbanDragContext,
  groupByStatus,
  handleDragEnd,
} from '@/lib/tasks/kanban-drag';
import { KanbanColumn } from './kanban-column';
import type { KanbanTask } from './kanban-card';


// Module-level constant so the default never produces a fresh array identity,
// which would invalidate the useMemo below on every render.
const NO_TASKS: never[] = [];

export function KanbanBoard() {
  const { data: tasks = NO_TASKS, isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  const groups = useMemo(
    () => groupByStatus(tasks as unknown as KanbanTask[]),
    [tasks],
  );

  // Bind the live mutations/groups the drag handler reads. Done in an effect
  // (not during render) so React 19's no-reassign-outside-component rule is
  // satisfied; the handler only fires after mount + user interaction, so the
  // effect has always run by then.
  useEffect(() => {
    bindKanbanDragContext({
      updateMutate: updateTask.mutate,
      reorderMutate: reorderTasks.mutate,
      tasksByStatus: groups,
    });
  }, [updateTask.mutate, reorderTasks.mutate, groups]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading board…</div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragEnd={handleDragEnd}
    >
      <div
        role="region"
        aria-label="Kanban board"
        className="flex h-full gap-4 overflow-x-auto p-4"
      >
        {COLUMN_ORDER.map((s) => (
          <KanbanColumn key={s} status={s} tasks={groups[s]} />
        ))}
      </div>
    </DndContext>
  );
}
