'use client';

import { useMemo } from 'react';
import { Trash2, X } from 'lucide-react';
import { groupTasksByDueBucket, type GroupableTask } from '@/lib/tasks/grouping';
import { TaskRow } from '@/components/tasks/task-row';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { TaskDTO } from '@/hooks/useTasks';

interface Props {
  tasks: TaskDTO[];
  selectedIds: Set<string>;
  now?: Date;
  onOpen: (id: string) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onDelete: (id: string) => Promise<void>;
  onDeleteSelected: () => Promise<void>;
  onToggleComplete: (id: string, status: 'TODO' | 'DONE') => void;
  isDeleting?: boolean;
  projects?: Record<string, string>;
}

const BUCKETS: { key: keyof ReturnType<typeof groupTasksByDueBucket>; label: string }[] = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today', label: 'Today' },
  { key: 'thisWeek', label: 'This Week' },
  { key: 'later', label: 'Later' },
  { key: 'noDate', label: 'No Date' },
];

function toGroupable(t: TaskDTO): GroupableTask {
  return {
    id: t.id,
    title: t.title,
    status: t.status,
    priority: t.priority,
    position: t.position,
    isPrivate: t.isPrivate,
    dueDate: t.dueDate ? new Date(t.dueDate) : null,
    completedAt: t.completedAt ? new Date(t.completedAt) : null,
  };
}

export function TaskList({
  tasks,
  selectedIds,
  now,
  onOpen,
  onSelectionChange,
  onDelete,
  onDeleteSelected,
  onToggleComplete,
  isDeleting = false,
  projects,
}: Props) {
  const taskMap = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks],
  );

  const grouped = useMemo(
    () => groupTasksByDueBucket(tasks.map(toGroupable), now),
    [tasks, now],
  );
  const visibleSelectedIds = useMemo(
    () =>
      new Set(
        tasks.flatMap((task) => (selectedIds.has(task.id) ? [task.id] : [])),
      ),
    [selectedIds, tasks],
  );
  const allSelected = tasks.length > 0 && visibleSelectedIds.size === tasks.length;

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No tasks here yet — create one with the quick-add above.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex min-h-9 flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-muted/20 px-3 py-2">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected ? true : visibleSelectedIds.size > 0 ? 'indeterminate' : false}
            onCheckedChange={(checked) =>
              onSelectionChange(checked ? new Set(tasks.map((task) => task.id)) : new Set())
            }
            aria-label="Select all visible tasks"
          />
          {visibleSelectedIds.size > 0
            ? `${visibleSelectedIds.size} selected`
            : 'Select tasks'}
        </label>
        {visibleSelectedIds.size > 0 ? (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onSelectionChange(new Set())}
            >
              <X className="h-4 w-4" aria-hidden />
              Clear
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={isDeleting}
              onClick={onDeleteSelected}
            >
              <Trash2 className="h-4 w-4" aria-hidden />
              {isDeleting ? 'Deleting…' : `Delete ${visibleSelectedIds.size}`}
            </Button>
          </div>
        ) : null}
      </div>
      {BUCKETS.map(({ key, label }) => {
        const items = grouped[key];
        if (items.length === 0) return null;
        return (
          <section key={key}>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {label} <span className="ml-1 text-muted-foreground/70">{items.length}</span>
            </h3>
            <div className="flex flex-col gap-1.5">
              {items.map((groupable) => {
                const task = taskMap.get(groupable.id);
                if (!task) return null;
                return (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={visibleSelectedIds.has(task.id)}
                    onOpen={onOpen}
                    onSelect={(id, selected) => {
                      const next = new Set(visibleSelectedIds);
                      if (selected) next.add(id);
                      else next.delete(id);
                      onSelectionChange(next);
                    }}
                    onDelete={onDelete}
                    onToggleComplete={onToggleComplete}
                    projects={projects}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
