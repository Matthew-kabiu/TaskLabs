'use client';

import { format } from 'date-fns';
import { Edit2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_COLORS } from '@/lib/tasks/colors';
import type { TaskDTO } from '@/hooks/useTasks';

interface Props {
  task: TaskDTO;
  onOpen: (id: string) => void;
  onToggleComplete: (id: string, nextStatus: 'TODO' | 'DONE') => void;
}

function initial(user: { name: string | null; email: string }) {
  const src = user.name?.trim() || user.email;
  return src.charAt(0).toUpperCase();
}

export function TaskRow({ task, onOpen, onToggleComplete }: Props) {
  const isDone = task.status === 'DONE';
  return (
    <div
      className="group flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 hover:bg-muted/40"
      data-testid={`task-row-${task.id}`}
      onDoubleClick={() => onOpen(task.id)}
    >
      <Checkbox
        checked={isDone}
        onCheckedChange={(v) => onToggleComplete(task.id, v ? 'DONE' : 'TODO')}
        aria-label={`Toggle ${task.title}`}
      />
      <span
        aria-label={`Priority ${task.priority}`}
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
      />
      <button
        type="button"
        className="flex-1 truncate text-left text-sm"
        onClick={() => onOpen(task.id)}
      >
        <span className={isDone ? 'line-through text-muted-foreground' : undefined}>
          {task.title}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-2">
        {task.labels.map(({ label }) => (
          <Badge
            key={label.id}
            variant="outline"
            style={{ borderColor: label.color, color: label.color }}
          >
            {label.name}
          </Badge>
        ))}
        {task.dueDate && (
          <span className="rounded border px-1.5 py-0.5 text-xs text-muted-foreground">
            {format(new Date(task.dueDate), 'MMM d')}
          </span>
        )}
        <div className="flex -space-x-1.5">
          {task.assignees.map(({ user }) => (
            <span
              key={user.id}
              title={user.name ?? user.email}
              className="grid h-6 w-6 place-items-center rounded-full border border-background bg-muted text-[10px] font-medium"
            >
              {initial(user)}
            </span>
          ))}
        </div>
        <Edit2 className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
    </div>
  );
}
