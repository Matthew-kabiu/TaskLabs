'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Edit2, Trash2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { PRIORITY_COLORS } from '@/lib/tasks/colors';
import type { TaskDTO } from '@/hooks/useTasks';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';

interface Props {
  task: TaskDTO;
  selected: boolean;
  onOpen: (id: string) => void;
  onSelect: (id: string, selected: boolean) => void;
  onDelete: (id: string) => Promise<void>;
  onToggleComplete: (id: string, nextStatus: 'TODO' | 'DONE') => void;
}

function initial(user: { name: string | null; email: string | null }) {
  const src = user.name?.trim() || user.email || '?';
  return src.charAt(0).toUpperCase();
}

export function TaskRow({
  task,
  selected,
  onOpen,
  onSelect,
  onDelete,
  onToggleComplete,
}: Props) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const isDone = task.status === 'DONE';
  return (
    <div
      className="group flex items-center gap-3 rounded-md border border-border/60 bg-background px-3 py-2 hover:bg-muted/40"
      data-testid={`task-row-${task.id}`}
      onDoubleClick={() => onOpen(task.id)}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={(value) => onSelect(task.id, Boolean(value))}
        aria-label={`Select ${task.title}`}
      />
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
        {task.labels.map((label) => (
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
          {task.assignees.map((user) => (
            <span
              key={user.id}
              title={user.name ?? user.email ?? 'Unknown user'}
              className="grid h-6 w-6 place-items-center rounded-full border border-background bg-muted text-[10px] font-medium"
            >
              {initial(user)}
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 className="h-3.5 w-3.5" aria-hidden />
        </button>
        <Edit2 className="h-3 w-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
      </div>
      <TaskDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        taskTitle={task.title}
        onConfirm={() => onDelete(task.id)}
      />
    </div>
  );
}
