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
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useTasks, useUpdateTask, useReorderTasks } from '@/lib/hooks/use-tasks';
import type { TaskStatus } from '@/lib/tasks/grouping';
import {
  computePosition,
  needsRebalance,
  rebalancePositions,
} from '@/lib/kanban-position';
import { KanbanColumn } from './kanban-column';
import type { KanbanTask } from './kanban-card';

const COLUMN_ORDER: TaskStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'ARCHIVED', 'CANCELLED'];

// Module-private mutable refs the test harness drives.
let _updateMutate: ((arg: {
  id: string;
  patch: Partial<KanbanTask>;
}) => void) | null = null;
let _reorderMutate: ((arg: {
  items: { id: string; position: number; status?: TaskStatus }[];
}) => void) | null = null;
let _tasksByStatus: Record<TaskStatus, KanbanTask[]> = {
  BACKLOG: [],
  TODO: [],
  IN_PROGRESS: [],
  IN_REVIEW: [],
  DONE: [],
  ARCHIVED: [],
  CANCELLED: [],
};

function groupByStatus(tasks: KanbanTask[]): Record<TaskStatus, KanbanTask[]> {
  const out: Record<TaskStatus, KanbanTask[]> = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: [],
    ARCHIVED: [],
    CANCELLED: [],
  };
  for (const t of tasks) out[t.status].push(t);
  for (const s of COLUMN_ORDER) out[s].sort((a, b) => a.position - b.position);
  return out;
}

function findContainingColumn(
  taskId: string,
  groups: Record<TaskStatus, KanbanTask[]>,
): TaskStatus | null {
  for (const s of COLUMN_ORDER) {
    if (groups[s].some((t) => t.id === taskId)) return s;
  }
  return null;
}

function handleDragEnd(ev: DragEndEvent) {
  const { active, over } = ev;
  if (!over || !_updateMutate || !_reorderMutate) return;

  const activeId = String(active.id);
  const overId = String(over.id);
  if (activeId === overId) return;

  const overType = (over.data?.current as { type?: string } | undefined)?.type;

  // Resolve source column.
  const sourceCol = findContainingColumn(activeId, _tasksByStatus);
  if (!sourceCol) return;

  // Resolve target column.
  const targetCol: TaskStatus =
    overType === 'column'
      ? (overId as TaskStatus)
      : (findContainingColumn(overId, _tasksByStatus) ?? sourceCol);

  // Build the *target* list as it will be after the move (excluding the active).
  const targetList = _tasksByStatus[targetCol].filter((t) => t.id !== activeId);

  // Compute insertion index.
  let insertAt: number;
  if (overType === 'column') {
    // Dropped on column body → append to end.
    insertAt = targetList.length;
  } else {
    const overIdx = targetList.findIndex((t) => t.id === overId);
    if (overIdx === -1) {
      insertAt = targetList.length;
    } else if (sourceCol === targetCol) {
      // Same-column drag: determine original position of active item.
      const activeOriginalIdx = _tasksByStatus[sourceCol].findIndex(
        (t) => t.id === activeId,
      );
      const overOriginalIdx = _tasksByStatus[sourceCol].findIndex(
        (t) => t.id === overId,
      );
      // If active was before over in the original list, after removing active
      // the over item shifts left by one, and we insert active AFTER over.
      insertAt = activeOriginalIdx < overOriginalIdx ? overIdx + 1 : overIdx;
    } else {
      insertAt = overIdx;
    }
  }

  const prev = insertAt === 0 ? null : targetList[insertAt - 1].position;
  const next =
    insertAt >= targetList.length ? null : targetList[insertAt].position;

  const newPosition = computePosition(prev, next);

  // Detect precision degradation → rebalance entire target column.
  if (needsRebalance(prev, next)) {
    const reordered = [
      ...targetList.slice(0, insertAt),
      { id: activeId, position: 0 } as Pick<KanbanTask, 'id' | 'position'>,
      ...targetList.slice(insertAt),
    ];
    const fresh = rebalancePositions(reordered.map((t) => t.id));
    const items =
      sourceCol === targetCol
        ? fresh
        : fresh.map((it) =>
            it.id === activeId ? { ...it, status: targetCol } : it,
          );
    _reorderMutate({ items });
    return;
  }

  if (sourceCol !== targetCol) {
    _updateMutate({
      id: activeId,
      patch: { status: targetCol, position: newPosition },
    });
    return;
  }

  // Same-column reorder.
  _reorderMutate({ items: [{ id: activeId, position: newPosition }] });
}

export function KanbanBoard() {
  const { data: tasks = [], isLoading } = useTasks();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();

  const groups = useMemo(
    () => groupByStatus(tasks as unknown as KanbanTask[]),
    [tasks],
  );

  // Bind module-private refs so handleDragEnd (and tests) can use them.
  // Done in an effect (not during render) so React 19's
  // no-reassign-outside-component rule is satisfied. The drag handler
  // only fires after mount + user interaction, so the effect has run
  // by the time it's needed.
  useEffect(() => {
    _updateMutate = updateTask.mutate;
    _reorderMutate = reorderTasks.mutate;
    _tasksByStatus = groups;
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

// Test-only export: the handler is pure-ish (closes over module state set
// during render), so we expose it for unit tests.
export const __test__ = { handleDragEnd };
