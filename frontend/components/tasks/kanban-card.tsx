'use client';

import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, isPast, isToday } from 'date-fns';
import { CalendarDays, Edit2, FolderKanban, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { useDeleteTask } from '@/hooks/useTasks';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';
import type { Priority, TaskStatus } from '@/lib/tasks/grouping';
import { cn } from '@/lib/utils';
import { useTaskPanel } from '@/lib/stores/task-panel';
import { ROUTES } from '@/lib/routes';

export interface KanbanTask {
  id: string;
  number?: number | null;
  workspaceId: string;
  creatorId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | Date | null;
  completedAt?: string | Date | null;
  isPrivate: boolean;
  projectId?: string | null;
  position: number;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  assignees: {
    id: string;
    userId: string;
    name: string | null;
    email: string | null;
  }[];
  labels: { id: string; name: string; color: string }[];
}

const PRIORITY_META: Record<
  Priority,
  { dot: string; label: string; text: string; bg: string }
> = {
  LOW:    { dot: 'bg-sky-500',    label: 'Low',    text: 'text-sky-500',    bg: 'bg-sky-500/10' },
  MEDIUM: { dot: 'bg-amber-500',  label: 'Medium', text: 'text-amber-500',  bg: 'bg-amber-500/10' },
  HIGH:   { dot: 'bg-orange-500', label: 'High',   text: 'text-orange-500', bg: 'bg-orange-500/10' },
  URGENT: { dot: 'bg-rose-500',   label: 'Urgent', text: 'text-rose-500',   bg: 'bg-rose-500/10' },
};

const AVATAR_PALETTE = [
  'bg-sky-500/20 text-sky-500',
  'bg-emerald-500/20 text-emerald-500',
  'bg-amber-500/20 text-amber-500',
  'bg-rose-500/20 text-rose-500',
  'bg-violet-500/20 text-violet-500',
  'bg-orange-500/20 text-orange-500',
];

function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initials(name: string | null, email: string | null): string {
  return (name ?? email ?? '?').slice(0, 2).toUpperCase();
}

interface KanbanCardProps {
  task: KanbanTask;
  projects?: Record<string, string>;
}

export function KanbanCard({ task, projects }: KanbanCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'task', task },
    animateLayoutChanges: () => true,
    transition: {
      duration: 260,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    },
  });

  const open = useTaskPanel((s) => s.open);
  const deleteTask = useDeleteTask();

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
    zIndex: isDragging ? 50 : 'auto',
    boxShadow: isDragging
      ? '0 12px 28px -8px rgba(0,0,0,0.45), 0 4px 10px -2px rgba(0,0,0,0.3)'
      : undefined,
    scale: isDragging ? '1.02' : '1',
    willChange: 'transform',
  };

  const priority = PRIORITY_META[task.priority];
  const projectTitle = task.projectId ? projects?.[task.projectId] : undefined;

  const due = task.dueDate ? new Date(task.dueDate) : null;
  const dueState =
    due && isPast(due) && !isToday(due) && task.status !== 'DONE'
      ? 'overdue'
      : due && isToday(due)
        ? 'today'
        : 'normal';

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    setDeleteOpen(true);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-testid={`kanban-card-${task.id}`}
      className={cn(
        'group relative overflow-hidden rounded-md border bg-card p-3 shadow-sm',
        'hover:border-foreground/30 focus-within:ring-2 focus-within:ring-ring',
      )}
    >
      {/*
        The drag handle and primary "open task" control. It covers the card but
        is a *sibling* of the edit/delete buttons rather than their ancestor —
        nesting real buttons inside another button is invalid ARIA and breaks
        keyboard navigation. Card content below is purely presentational.

        `role`/`tabIndex` are also supplied by dnd-kit's `attributes`, but they
        are repeated explicitly after the spread so the interactive contract is
        visible to readers and static analysis, and so a change to dnd-kit's
        defaults cannot silently strip keyboard access. A real <button> is not
        used here because Enter/Space would trigger both the native click and
        dnd-kit's KeyboardSensor.
      */}
      <span
        {...attributes}
        {...listeners}
        role="button"
        tabIndex={0}
        aria-label={`Task: ${task.title}`}
        onClick={(e) => {
          if (isDragging) return;
          e.stopPropagation();
          open(task.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            open(task.id);
          }
        }}
        className="absolute inset-0 z-0 cursor-grab rounded-md focus:outline-none active:cursor-grabbing"
      />
      {/* Priority side accent */}
      <span
        aria-hidden
        className={cn('absolute inset-y-0 left-0 z-10 w-0.5', priority.dot)}
      />

      {/* Title row */}
      <div className="flex items-start justify-between gap-2 pl-1">
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            #{task.number ?? '—'}
          </span>
          <p className="line-clamp-2 text-sm font-medium leading-snug">
            {task.title}
          </p>
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label="Edit task"
            onClick={(e) => {
              e.stopPropagation();
              open(task.id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Edit2 className="h-3 w-3" />
          </button>
          <button
            type="button"
            aria-label="Delete task"
            onClick={handleDelete}
            onPointerDown={(e) => e.stopPropagation()}
            className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Description preview */}
      {task.description && (
        <p className="mt-1.5 line-clamp-2 pl-1 text-xs text-muted-foreground">
          {task.description}
        </p>
      )}

      {/* Meta chips: priority + labels + due — all inline */}
      <div className="mt-2 flex flex-wrap items-center gap-1.5 pl-1">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide',
            priority.bg,
            priority.text,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', priority.dot)} />
          {priority.label}
        </span>

        {task.labels.map((label) => (
          <span
            key={label.id}
            className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium"
            style={{
              backgroundColor: `${label.color}1f`,
              color: label.color,
              borderColor: `${label.color}55`,
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: label.color }}
            />
            {label.name}
          </span>
        ))}

        {projectTitle && task.projectId ? (
          <Link
            href={ROUTES.app.project(task.projectId)}
            className="relative z-10 inline-flex items-center gap-1 rounded border border-sky-500/30 bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-medium text-sky-400 hover:border-sky-500/50"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <FolderKanban className="h-2.5 w-2.5" />
            {projectTitle}
          </Link>
        ) : null}

        {due && (
          <span
            className={cn(
              'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium',
              dueState === 'overdue' &&
                'border-rose-500/40 bg-rose-500/10 text-rose-500',
              dueState === 'today' &&
                'border-amber-500/40 bg-amber-500/10 text-amber-500',
              dueState === 'normal' && 'border-border text-muted-foreground',
            )}
          >
            <CalendarDays className="h-2.5 w-2.5" />
            {format(due, 'MMM d')}
          </span>
        )}
      </div>

      {/* Assignees row */}
      {task.assignees.length > 0 && (
        <div className="mt-2.5 flex items-center justify-between pl-1">
          <div className="flex -space-x-1.5">
            {task.assignees.slice(0, 4).map((user) => (
              <div
                key={user.id}
                title={user.name ?? user.email ?? 'Unknown user'}
                className={cn(
                  'flex h-6 w-6 items-center justify-center rounded-full border-2 border-card text-[10px] font-semibold',
                  avatarColor(user.id),
                )}
              >
                {initials(user.name, user.email)}
              </div>
            ))}
            {task.assignees.length > 4 && (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
                +{task.assignees.length - 4}
              </div>
            )}
          </div>
          {task.assignees.length === 1 && (
            <span className="text-[11px] text-muted-foreground">
              {task.assignees[0].name ?? task.assignees[0].email ?? 'Unknown user'}
            </span>
          )}
        </div>
      )}
      <TaskDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        taskTitle={task.title}
        onConfirm={async () => {
          try {
            await deleteTask.mutateAsync(task.id);
            toast.success('Task deleted');
          } catch (error) {
            toast.error((error as Error).message);
            throw error;
          }
        }}
      />
    </div>
  );
}
