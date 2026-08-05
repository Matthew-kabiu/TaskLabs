'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  FolderKanban,
  FolderPlus,
  Link2,
  Loader2,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import type {
  ProjectDTO,
  ProjectPriority,
  ProjectResourceType,
  ProjectStatus,
} from '@/hooks/useProjects';
import type { WorkspaceMemberDTO } from '@/hooks/useWorkspaces';
import type {
  CreateProjectInput,
  ProjectResourceInput,
  UpdateProjectInput,
} from '@/lib/validations/project.schema';
import {
  PROJECT_PRIORITY_META,
  PROJECT_RESOURCE_TYPE_META,
  PROJECT_STATUS_META,
  Dot,
} from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: ProjectDTO | null;
  members: WorkspaceMemberDTO[];
  onCreate: (input: CreateProjectInput) => Promise<void>;
  onUpdate: (id: string, input: UpdateProjectInput) => Promise<void>;
}

function emptyResource(): ProjectResourceInput {
  return { label: '', type: 'WEBSITE', url: '' };
}

const AVATAR_TONES = [
  'bg-sky-500/15 text-sky-400 ring-sky-500/20',
  'bg-emerald-500/15 text-emerald-400 ring-emerald-500/20',
  'bg-amber-500/15 text-amber-400 ring-amber-500/20',
  'bg-violet-500/15 text-violet-400 ring-violet-500/20',
  'bg-rose-500/15 text-rose-400 ring-rose-500/20',
] as const;

function memberInitials(member: WorkspaceMemberDTO) {
  const value = member.name?.trim() || member.email || '?';
  const parts = value.split(/\s+/);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

function memberTone(seed: string) {
  let hash = 0;
  for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) | 0;
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

export function ProjectFormDialog({
  open,
  onOpenChange,
  project,
  members,
  onCreate,
  onUpdate,
}: Props) {
  const [title, setTitle] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [status, setStatus] = React.useState<ProjectStatus>('PLANNING');
  const [priority, setPriority] = React.useState<ProjectPriority>('MEDIUM');
  const [memberIds, setMemberIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState<Date | undefined>();
  const [endDate, setEndDate] = React.useState<Date | null>(null);
  const [resources, setResources] = React.useState<ProjectResourceInput[]>([
    emptyResource(),
  ]);
  const [saving, setSaving] = React.useState(false);

  const identity = project?.id ?? (open ? '__create__' : null);
  const [syncedIdentity, setSyncedIdentity] = React.useState<string | null>(null);

  if (identity !== null && identity !== syncedIdentity) {
    setSyncedIdentity(identity);
    if (project) {
      setTitle(project.title);
      setDescription(project.description ?? '');
      setStatus(project.status);
      setPriority(project.priority);
      setMemberIds(project.memberIds);
      setStartDate(project.startDate ? new Date(project.startDate) : undefined);
      setEndDate(project.endDate ? new Date(project.endDate) : null);
      setResources(
        project.resources.length > 0
          ? project.resources.map((r) => ({ ...r }))
          : [emptyResource()],
      );
    } else {
      setTitle('');
      setDescription('');
      setStatus('PLANNING');
      setPriority('MEDIUM');
      setMemberIds([]);
      setStartDate(undefined);
      setEndDate(null);
      setResources([emptyResource()]);
    }
  }

  const toggleMember = (id: string, checked: boolean) => {
    setMemberIds((current) =>
      checked
        ? [...current, id]
        : current.filter((memberId) => memberId !== id),
    );
  };

  const patchResource = (index: number, patch: Partial<ProjectResourceInput>) => {
    setResources((current) =>
      current.map((resource, i) => (i === index ? { ...resource, ...patch } : resource)),
    );
  };

  const handleSave = async () => {
    if (title.trim().length < 1) return;
    setSaving(true);
    try {
      const filledResources = resources.filter((r) => r.label.trim() !== '' || r.url.trim() !== '');
      const base = {
        title,
        description: description.length ? description : undefined,
        status,
        priority,
        memberIds,
        startDate,
        endDate,
        resources: filledResources,
      };
      if (project) {
        await onUpdate(project.id, {
          title,
          description: description.length ? description : null,
          status,
          priority,
          memberIds,
          startDate: startDate ?? null,
          endDate,
          resources: filledResources,
        });
      } else {
        await onCreate(base);
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader>
          <div className="flex items-start gap-3 border-b border-border/60 px-6 py-5">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div className="space-y-1">
              <DialogTitle>{project ? 'Edit project' : 'Create project'}</DialogTitle>
              <DialogDescription>
                {project
                  ? 'Update the project details, team, and shared resources.'
                  : 'Create a shared workspace for tasks, people, and resources.'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-6 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="project-title">Title</Label>
            <Input
              id="project-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Website revamp"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="project-desc">Description</Label>
            <textarea
              id="project-desc"
              className="min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project trying to achieve?"
            />
          </div>

          <section className="space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-medium">Planning</h3>
            </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as ProjectStatus)}
              >
                <SelectTrigger
                  className={cn(
                    'ring-1 ring-inset transition-colors',
                    PROJECT_STATUS_META[status].ring,
                  )}
                >
                  <SelectValue aria-label={status}>
                    <span className="flex items-center gap-2">
                      <Dot className={PROJECT_STATUS_META[status].dot} />
                      {PROJECT_STATUS_META[status].label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <Dot className={PROJECT_STATUS_META[s].dot} />
                        {PROJECT_STATUS_META[s].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label>Priority</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as ProjectPriority)}
              >
                <SelectTrigger>
                  <SelectValue aria-label={priority}>
                    <span
                      className={cn(
                        'flex items-center gap-2 font-medium',
                        PROJECT_PRIORITY_META[priority].text,
                      )}
                    >
                      <Dot className={PROJECT_PRIORITY_META[priority].dot} />
                      {PROJECT_PRIORITY_META[priority].label}
                    </span>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PROJECT_PRIORITY_META) as ProjectPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      <span className={cn('flex items-center gap-2', PROJECT_PRIORITY_META[p].text)}>
                        <Dot className={PROJECT_PRIORITY_META[p].dot} />
                        {PROJECT_PRIORITY_META[p].label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Start date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : 'No start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(d) => setStartDate(d ?? undefined)}
                    initialFocus
                  />
                  <div className="flex justify-end p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStartDate(undefined)}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-2">
              <Label>End date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : 'No end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate ?? undefined}
                    onSelect={(d) => setEndDate(d ?? null)}
                    initialFocus
                  />
                  <div className="flex justify-end p-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setEndDate(null)}
                    >
                      Clear
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          </section>

          <section className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Members</h3>
              </div>
              <span className="text-xs text-muted-foreground">
                {memberIds.length} selected
              </span>
            </div>
            {members.length === 0 ? (
              <span className="text-xs text-muted-foreground">
                Invite members to this workspace before assigning them.
              </span>
            ) : (
              <div className="grid gap-2 sm:grid-cols-2">
                {members.map((member) => (
                  <label
                    key={member.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      memberIds.includes(member.id)
                        ? 'border-sky-500/40 bg-sky-500/5'
                        : 'border-border/60 bg-background/50 hover:bg-muted/40',
                    )}
                  >
                    <span
                      className={cn(
                        'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[10px] font-semibold ring-1',
                        memberTone(member.id),
                      )}
                    >
                      {memberInitials(member)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">
                        {member.name ?? member.email ?? member.id}
                      </span>
                      {member.name && member.email ? (
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      ) : null}
                    </span>
                    <Checkbox
                      checked={memberIds.includes(member.id)}
                      onCheckedChange={(checked) =>
                        toggleMember(member.id, checked === true)
                      }
                    />
                  </label>
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/10 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                <h3 className="text-sm font-medium">Resources</h3>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setResources((current) => [...current, emptyResource()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Add resource
              </Button>
            </div>
            <div className="flex flex-col gap-2">
              {resources.map((resource, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto_1fr_auto] items-end gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">Label</Label>
                    <Input
                      value={resource.label}
                      onChange={(e) =>
                        patchResource(index, { label: e.target.value })
                      }
                      placeholder="Design file"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">Type</Label>
                    <Select
                      value={resource.type}
                      onValueChange={(v) =>
                        patchResource(index, { type: v as ProjectResourceType })
                      }
                    >
                      <SelectTrigger className="w-36">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(PROJECT_RESOURCE_TYPE_META) as ProjectResourceType[]).map(
                          (type) => (
                            <SelectItem key={type} value={type}>
                              {PROJECT_RESOURCE_TYPE_META[type].label}
                            </SelectItem>
                          ),
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] text-muted-foreground">URL</Label>
                    <Input
                      value={resource.url}
                      onChange={(e) => patchResource(index, { url: e.target.value })}
                      placeholder="https://…"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-rose-500"
                    onClick={() =>
                      setResources((current) =>
                        current.filter((_, i) => i !== index),
                      )
                    }
                    disabled={resources.length === 1}
                    aria-label="Remove resource"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <DialogFooter className="border-t border-border/60 bg-muted/10 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            <X className="mr-1.5 h-4 w-4" /> Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || title.trim().length < 1}
          >
            {saving ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving…
              </>
            ) : project ? (
              <><Save className="mr-1.5 h-4 w-4" /> Save changes</>
            ) : (
              <><FolderPlus className="mr-1.5 h-4 w-4" /> Create project</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
