'use client';

import { useMemo } from 'react';
import { groupTasksByDueBucket, type GroupableTask } from '@/lib/tasks/grouping';
import { TaskRow } from '@/components/tasks/task-row';
import type { TaskDTO } from '@/hooks/useTasks';

interface Props {
  tasks: TaskDTO[];
  now?: Date;
  onOpen: (id: string) => void;
  onToggleComplete: (id: string, status: 'TODO' | 'DONE') => void;
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

export function TaskList({ tasks, now, onOpen, onToggleComplete }: Props) {
  const taskMap = useMemo(
    () => new Map(tasks.map((t) => [t.id, t])),
    [tasks],
  );

  const grouped = useMemo(
    () => groupTasksByDueBucket(tasks.map(toGroupable), now),
    [tasks, now],
  );

  if (tasks.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
        No tasks here yet — create one with the quick-add above.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
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
                    onOpen={onOpen}
                    onToggleComplete={onToggleComplete}
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
