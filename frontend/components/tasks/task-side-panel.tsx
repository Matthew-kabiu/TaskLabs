'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, Loader2, Tag, Trash2, Users, X } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { TaskDTO } from '@/hooks/useTasks';
import type { LabelDTO } from '@/hooks/useLabels';
import type { CreateTaskInput, UpdateTaskInput } from '@/lib/validations/task.schema';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';

const AVATAR_PALETTE = [
  { bg: 'bg-sky-500/20',    text: 'text-sky-500',     dot: 'bg-sky-500' },
  { bg: 'bg-emerald-500/20',text: 'text-emerald-500', dot: 'bg-emerald-500' },
  { bg: 'bg-amber-500/20',  text: 'text-amber-500',   dot: 'bg-amber-500' },
  { bg: 'bg-rose-500/20',   text: 'text-rose-500',    dot: 'bg-rose-500' },
  { bg: 'bg-violet-500/20', text: 'text-violet-500',  dot: 'bg-violet-500' },
  { bg: 'bg-orange-500/20', text: 'text-orange-500',  dot: 'bg-orange-500' },
];

function avatarTheme(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function userInitials(name: string | null, email: string): string {
  return (name ?? email).slice(0, 2).toUpperCase();
}
import { cn } from '@/lib/utils';

const STATUS_META: Record<
  TaskDTO['status'],
  { label: string; dot: string; ring: string }
> = {
  BACKLOG:    { label: 'Backlog',     dot: 'bg-zinc-400',    ring: 'ring-zinc-400/30' },
  TODO:       { label: 'Todo',        dot: 'bg-sky-500',     ring: 'ring-sky-500/30' },
  IN_PROGRESS:{ label: 'In Progress', dot: 'bg-amber-500',   ring: 'ring-amber-500/30' },
  IN_REVIEW:  { label: 'In Review',   dot: 'bg-violet-500',  ring: 'ring-violet-500/30' },
  DONE:       { label: 'Done',        dot: 'bg-emerald-500', ring: 'ring-emerald-500/30' },
  ARCHIVED:   { label: 'Archived',    dot: 'bg-stone-500',   ring: 'ring-stone-500/30' },
  CANCELLED:  { label: 'Cancelled',   dot: 'bg-rose-500',    ring: 'ring-rose-500/30' },
};

const PRIORITY_META: Record<
  TaskDTO['priority'],
  { label: string; dot: string; text: string }
> = {
  LOW:    { label: 'Low',    dot: 'bg-sky-500',    text: 'text-sky-500' },
  MEDIUM: { label: 'Medium', dot: 'bg-amber-500',  text: 'text-amber-500' },
  HIGH:   { label: 'High',   dot: 'bg-orange-500', text: 'text-orange-500' },
  URGENT: { label: 'Urgent', dot: 'bg-rose-500',   text: 'text-rose-500' },
};

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block h-2 w-2 shrink-0 rounded-full', className)}
    />
  );
}

export interface MemberDTO {
  id: string;
  name: string | null;
  email: string;
}

interface Props {
  open: boolean;
  task: TaskDTO | null;
  members: MemberDTO[];
  labels: LabelDTO[];
  onClose: () => void;
  onCreate?: (input: CreateTaskInput) => Promise<void>;
  onSave: (id: string, input: UpdateTaskInput) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskSidePanel({
  open,
  task,
  members,
  labels,
  onClose,
  onCreate,
  onSave,
  onDelete,
}: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskDTO['status']>('TODO');
  const [priority, setPriority] = useState<TaskDTO['priority']>('MEDIUM');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [isPrivate, setIsPrivate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  // Reset the form when the panel switches to a *different* task (or to create
  // mode), using React's documented "adjust state during render" pattern rather
  // than an effect: no extra commit, no cascading render, and no eslint escape
  // hatch.
  //
  // Keying off identity — not the whole task object — is deliberate. Convex
  // pushes live updates, so re-syncing on every object change meant a
  // concurrent edit by another workspace member overwrote whatever the current
  // user had typed. Now a live update to the task you are editing leaves your
  // in-progress text alone; the save button's `isDirty` comparison below still
  // diffs against the freshest server values.
  const identity = task?.id ?? (open ? '__create__' : null);
  const [syncedIdentity, setSyncedIdentity] = useState<string | null>(null);

  if (identity !== null && identity !== syncedIdentity) {
    setSyncedIdentity(identity);
    if (task) {
      setTitle(task.title);
      setDescription(task.description ?? '');
      setStatus(task.status);
      setPriority(task.priority);
      setDueDate(task.dueDate ? new Date(task.dueDate) : undefined);
      setIsPrivate(task.isPrivate);
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate(undefined);
      setIsPrivate(false);
    }
  }

  if (!task && !onCreate) return null;

  // Detect unsaved changes for the save button.
  const isDirty = task
    ? title !== task.title ||
      (description || null) !== (task.description ?? null) ||
      status !== task.status ||
      priority !== task.priority ||
      (dueDate?.getTime() ?? null) !==
        (task.dueDate ? new Date(task.dueDate).getTime() : null) ||
      isPrivate !== task.isPrivate
    : title.trim().length > 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (task) {
        await onSave(task.id, {
          title,
          description: description.length ? description : null,
          status,
          priority,
          dueDate: dueDate ?? null,
          isPrivate,
        });
      } else if (onCreate) {
        await onCreate({
          title,
          description: description.length ? description : undefined,
          status,
          priority,
          dueDate,
          isPrivate,
          assigneeIds: [],
          labelIds: [],
        });
      }
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => (!v ? onClose() : undefined)}>
      <SheetContent className="w-full max-w-md sm:max-w-lg flex flex-col gap-4">
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 top-0 h-0.5 transition-colors',
            STATUS_META[status].dot,
          )}
        />
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Dot className={STATUS_META[status].dot} />
            {task ? 'Edit task' : 'Create task'}
            {task ? (
              <span className="ml-1 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                #{task.number}
              </span>
            ) : null}
          </SheetTitle>
          <SheetDescription>
            {task
              ? `Created ${format(new Date(task.createdAt), 'PPP')}`
              : 'Add the task details before creating it.'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 overflow-y-auto pr-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="task-desc">Description</Label>
            <textarea
              id="task-desc"
              className="min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskDTO['status'])}>
                <SelectTrigger
                  className={cn(
                    'ring-1 ring-inset transition-colors',
                    STATUS_META[status].ring,
                  )}
                >
                  <SelectValue aria-label={status}>
                    <span className="flex items-center gap-2">
                      <Dot className={STATUS_META[status].dot} />
                      {STATUS_META[status].label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_META) as TaskDTO['status'][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <Dot className={STATUS_META[s].dot} />
                        {STATUS_META[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskDTO['priority'])}>
                <SelectTrigger>
                  <SelectValue aria-label={priority}>
                    <span
                      className={cn(
                        'flex items-center gap-2 font-medium',
                        PRIORITY_META[priority].text,
                      )}
                    >
                      <Dot className={PRIORITY_META[priority].dot} />
                      {PRIORITY_META[priority].label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PRIORITY_META) as TaskDTO['priority'][]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={cn('flex items-center gap-2', PRIORITY_META[p].text)}>
                        <Dot className={PRIORITY_META[p].dot} />
                        {PRIORITY_META[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Due date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button type="button" variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dueDate ? format(dueDate, 'PPP') : 'No due date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={(d) => setDueDate(d ?? undefined)}
                  initialFocus
                />
                <div className="flex justify-end p-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => setDueDate(undefined)}>
                    Clear
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex flex-col gap-2">
            <Label className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-muted-foreground" />
              Assignees
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {members.length === 0 && (
                <span className="text-xs text-muted-foreground">No members</span>
              )}
              {members.map((m) => {
                const theme = avatarTheme(m.id);
                return (
                  <span
                    key={m.id}
                    className={cn(
                      'group inline-flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-xs transition-colors',
                      'border-border bg-background',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold',
                        theme.bg,
                        theme.text,
                      )}
                    >
                      {userInitials(m.name, m.email)}
                    </span>
                    <span className="text-muted-foreground">
                      {m.name ?? m.email}
                    </span>
                    <span
                      aria-hidden
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full transition-colors',
                        theme.dot,
                      )}
                    />
                  </span>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                Labels
              </Label>
            </div>

            {/* Attached labels — only show what's actually on this task */}
            {labels.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Labels are not available for this workspace yet.
              </span>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {labels
                  .map((l) => (
                    <span
                      key={l.id}
                      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm transition-opacity hover:opacity-90"
                      style={{
                        backgroundColor: l.color,
                        color: '#fff',
                        borderColor: l.color,
                      }}
                    >
                      {l.name}
                    </span>
                  ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="task-private"
              checked={isPrivate}
              onCheckedChange={(v) => setIsPrivate(Boolean(v))}
            />
            <Label htmlFor="task-private">Private (only you can see this task)</Label>
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {task ? (
            <Button
              type="button"
              variant="ghost"
              className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose}>
              <X className="mr-1.5 h-4 w-4" /> Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || !title.trim() || !isDirty}
              className={cn(isDirty && !saving && 'ring-2 ring-emerald-500/40')}
            >
              {saving ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <Check className="mr-1.5 h-4 w-4" />
                  {task ? (isDirty ? 'Save changes' : 'Saved') : 'Create task'}
                </>
              )}
            </Button>
          </div>
        </div>
        {task ? (
          <TaskDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            taskTitle={task.title}
            onConfirm={async () => {
              await onDelete(task.id);
              onClose();
            }}
          />
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
