'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import type { TaskStatus } from '@/lib/tasks/grouping';
import { cn } from '@/lib/utils';
import { KanbanCard, type KanbanTask } from './kanban-card';

const COLUMN_LABEL: Record<TaskStatus, string> = {
  TODO: 'Todo',
  IN_PROGRESS: 'In Progress',
  DONE: 'Done',
  ARCHIVED: 'Archived',
  BACKLOG: 'Backlog',
  IN_REVIEW: 'In Review',
  CANCELLED: 'Cancelled',
};

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: KanbanTask[];
}

export function KanbanColumn({ status, tasks }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: { type: 'column', status },
  });

  const itemIds = tasks.map((t) => t.id);

  return (
    <section
      aria-label={`${COLUMN_LABEL[status]} column`}
      className="flex h-full w-72 shrink-0 flex-col rounded-lg border bg-muted/30"
    >
      <header className="flex items-center justify-between border-b px-3 py-2">
        <h3 className="text-sm font-semibold">{COLUMN_LABEL[status]}</h3>
        <span
          aria-label={`${tasks.length} tasks`}
          className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
        >
          {tasks.length}
        </span>
      </header>

      <div
        ref={setNodeRef}
        data-testid={`kanban-column-${status}`}
        className={cn(
          'flex-1 space-y-2 overflow-y-auto p-2 transition-colors',
          isOver && 'bg-muted/60',
        )}
      >
        <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
          {tasks.map((t) => (
            <KanbanCard key={t.id} task={t} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Drop tasks here
          </p>
        )}
      </div>
    </section>
  );
}

export { COLUMN_LABEL };
