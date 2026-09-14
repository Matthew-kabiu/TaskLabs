'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, Check, EyeOff, FolderKanban, Loader2, PencilLine, Tag, Trash2, Users } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { TaskComments } from '@/components/tasks/task-comments';

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
  projects: { id: string; title: string }[];
  defaultProjectId?: string | null;
  workspaceId?: string | null;
  onClose: () => void;
  onCreate?: (input: CreateTaskInput & { projectId?: string | null }) => Promise<void>;
  onSave: (id: string, input: UpdateTaskInput & { projectId?: string | null }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function TaskSidePanel({
  open,
  task,
  members,
  labels,
  projects,
  defaultProjectId = null,
  workspaceId = null,
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
  const [projectId, setProjectId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

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
  const identity =
    task?.id ?? (open ? `__create__:${defaultProjectId ?? ''}` : null);
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
      setProjectId(task.projectId);
      setEditingDescription(false);
    } else {
      setTitle('');
      setDescription('');
      setStatus('TODO');
      setPriority('MEDIUM');
      setDueDate(undefined);
      setIsPrivate(false);
      setProjectId(defaultProjectId);
      setEditingDescription(true);
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
      isPrivate !== task.isPrivate ||
      projectId !== task.projectId
    : title.trim().length > 0;

  const taskLabels = task?.labels ?? labels;
  const taskAssignees = task?.assignees ?? [];

  const handleClose = () => {
    setEditingDescription(false);
    onClose();
  };

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
          projectId,
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
          projectId: projectId ?? undefined,
        });
      }
      handleClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? handleClose() : undefined)}>
      <DialogContent className="flex h-[min(90vh,860px)] w-[calc(100%-1.5rem)] max-w-5xl flex-col gap-0 overflow-hidden p-0">
        <span
          aria-hidden
          className={cn(
            'absolute inset-x-0 top-0 h-0.5 transition-colors',
            STATUS_META[status].dot,
          )}
        />
        <DialogHeader className="border-b px-5 py-3 pr-14 sm:px-8">
          <DialogTitle className="sr-only">
            {task ? `Edit task ${task.number}` : 'Create task'}
          </DialogTitle>
          <DialogDescription className="flex min-w-0 items-center gap-2 text-xs">
            <Dot className={STATUS_META[status].dot} />
            <span className="font-medium text-foreground">
              {task ? `Task #${task.number}` : 'New task'}
            </span>
            <span aria-hidden>·</span>
            <span className="truncate">
              {task
                ? `Created ${format(new Date(task.createdAt), 'PPP')}`
                : 'Add the task details before creating it'}
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_18rem] lg:overflow-hidden">
          <main className="min-w-0 space-y-7 px-5 py-6 sm:px-8 lg:overflow-y-auto">
            <div>
              <Label htmlFor="task-title" className="sr-only">Title</Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Task title"
                className="h-auto border-0 bg-transparent px-0 py-1 text-2xl font-semibold leading-tight tracking-tight shadow-none focus-visible:ring-0 md:text-3xl"
              />
            </div>

            <section aria-labelledby="task-description-heading" className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <Label id="task-description-heading" htmlFor={editingDescription ? 'task-desc' : undefined} className="text-base font-semibold tracking-tight">
                  Description
                </Label>
                {task ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-muted-foreground"
                    onClick={() => setEditingDescription((current) => !current)}
                    aria-expanded={editingDescription}
                    aria-controls="task-description-content"
                  >
                    <PencilLine className="mr-1 h-3.5 w-3.5" />
                    {editingDescription ? 'View description' : 'Edit description'}
                  </Button>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Plain text</span>
                )}
              </div>
              <div id="task-description-content">
                {editingDescription ? (
                  <textarea
                    id="task-desc"
                    className="min-h-56 w-full resize-y rounded-md border border-border/70 bg-muted/20 px-4 py-3 text-sm leading-6 outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/20"
                    placeholder="Add context, requirements, or acceptance notes…"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                ) : description.trim() ? (
                  <p className="whitespace-pre-wrap py-1 text-[15px] leading-7 text-foreground/90">{description}</p>
                ) : (
                  <button
                    type="button"
                    className="w-full rounded-md border border-dashed border-border/70 px-4 py-5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    onClick={() => setEditingDescription(true)}
                  >
                    Add a description…
                  </button>
                )}
              </div>
            </section>

            {task ? (
              <TaskComments taskId={task.id} workspaceId={workspaceId} members={members} />
            ) : null}
          </main>

          <aside className="border-t bg-muted/20 px-5 py-5 lg:overflow-y-auto lg:border-l lg:border-t-0">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Properties
            </h3>

            <div className="divide-y divide-border/60">
              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 py-2.5">
                <Label className="text-xs text-muted-foreground">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as TaskDTO['status'])}>
                <SelectTrigger
                  className={cn(
                    'h-8 border-0 bg-transparent px-2 text-xs shadow-none ring-1 ring-inset transition-colors',
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

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 py-2.5">
                <Label className="text-xs text-muted-foreground">Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as TaskDTO['priority'])}>
                <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-xs shadow-none">
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

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 py-2.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Due date
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="h-8 justify-start px-2 text-xs font-normal">
                      {dueDate ? format(dueDate, 'PP') : 'No due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
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

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 py-2.5">
                <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <FolderKanban className="h-3.5 w-3.5" />
                  Project
                </Label>
                <Select
                  value={projectId ?? '__none__'}
                  onValueChange={(v) => setProjectId(v === '__none__' ? null : v)}
                >
                  <SelectTrigger className="h-8 border-0 bg-transparent px-2 text-xs shadow-none">
                    <SelectValue aria-label={projectId ?? 'No project'}>
                      {projectId
                        ? (projects.find((p) => p.id === projectId)?.title ?? 'Project')
                        : 'No project'}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">No project</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 py-3">
                <Label className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  Assignees
                </Label>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {taskAssignees.length === 0 ? (
                    <span className="px-2 py-1 text-xs text-muted-foreground">Unassigned</span>
                  ) : (
                    taskAssignees.map((assignee) => {
                      const theme = avatarTheme(assignee.userId);
                      return (
                        <span key={assignee.id} className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background py-0.5 pl-0.5 pr-2 text-xs">
                          <span className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold', theme.bg, theme.text)}>
                            {userInitials(assignee.name, assignee.email ?? '')}
                          </span>
                          <span className="truncate">{assignee.name ?? assignee.email ?? 'Unknown'}</span>
                        </span>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-start gap-3 py-3">
                <Label className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
                  <Tag className="h-3.5 w-3.5" />
                  Labels
                </Label>
                <div className="flex min-w-0 flex-wrap gap-1.5">
                  {taskLabels.length === 0 ? (
                    <span className="px-2 py-1 text-xs text-muted-foreground">No labels</span>
                  ) : (
                    taskLabels.map((label) => (
                      <span
                        key={label.id}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-border bg-background px-2 py-1 text-xs"
                      >
                        <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: label.color }} />
                        <span className="truncate">{label.name}</span>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-3 py-3">
                <Label htmlFor="task-private" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <EyeOff className="h-3.5 w-3.5" />
                  Private
                </Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="task-private"
                    checked={isPrivate}
                    onCheckedChange={(v) => setIsPrivate(Boolean(v))}
                  />
                  <Label htmlFor="task-private" className="text-xs font-normal">
                    Only me
                  </Label>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="flex items-center justify-between gap-2 border-t bg-background px-5 py-3 sm:px-8">
          {task ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="mr-1 h-4 w-4" /> Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
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
              handleClose();
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
