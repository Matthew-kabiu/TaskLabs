'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import type { KanbanTask } from './kanban-card';
import type { TaskListFilters } from '@/hooks/useTasks';


// Module-level constant so the default never produces a fresh array identity,
// which would invalidate the useMemo below on every render.
const NO_TASKS: never[] = [];
// Keep button navigation aligned with the fixed w-72 columns and gap-4 spacing.
const COLUMN_SCROLL_DISTANCE = 304;

export function KanbanBoard({
  filters = {},
  projects,
  onOpenTask,
  enabled = true,
}: {
  filters?: TaskListFilters;
  projects?: Record<string, string>;
  onOpenTask?: (id: string) => void;
  enabled?: boolean;
}) {
  const boardRef = useRef<HTMLDivElement>(null);
  const { data: tasks = NO_TASKS, isLoading } = useTasks(
    filters,
    undefined,
    enabled,
  );
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

  const scrollBoard = (direction: -1 | 1) => {
    boardRef.current?.scrollBy({
      left: direction * COLUMN_SCROLL_DISTANCE,
    });
  };

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
      <div className="flex h-full min-h-0 flex-col">
        <div
          role="group"
          aria-label="Kanban board navigation"
          className="flex shrink-0 items-center justify-end gap-1 px-4 pt-4"
        >
          <span className="mr-1 text-xs text-muted-foreground">Scroll board</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Scroll board left"
            title="Scroll board left"
            onClick={() => scrollBoard(-1)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            aria-label="Scroll board right"
            title="Scroll board right"
            onClick={() => scrollBoard(1)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
        <div
          ref={boardRef}
          role="region"
          aria-label="Kanban board"
          className="flex h-full min-h-0 gap-4 overflow-x-auto overscroll-x-contain scroll-smooth p-4 pt-2"
        >
          {COLUMN_ORDER.map((s) => (
            <KanbanColumn
              key={s}
              status={s}
              tasks={groups[s]}
              projects={projects}
              onOpenTask={onOpenTask}
            />
          ))}
        </div>
      </div>
    </DndContext>
  );
}
