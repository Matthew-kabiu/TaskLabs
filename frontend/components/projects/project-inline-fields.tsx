'use client';

import { format, startOfDay } from 'date-fns';
import { CalendarDays, Signal, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  ProjectDTO,
  ProjectPriority,
  ProjectStatus,
} from '@/hooks/useProjects';
import type { WorkspaceMemberDTO } from '@/hooks/useWorkspaces';
import type { UpdateProjectInput } from '@/lib/validations/project.schema';
import {
  PROJECT_PRIORITY_META,
  PROJECT_STATUS_META,
  Dot,
} from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

interface FieldProps {
  project: ProjectDTO;
  onUpdate: (input: UpdateProjectInput) => Promise<void> | void;
  disabled?: boolean;
}

function stopPropagation(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function ProjectStatusSelect({ project, onUpdate, disabled }: FieldProps) {
  return (
    <div onClick={stopPropagation} onPointerDown={stopPropagation}>
      <Select
        value={project.status}
        onValueChange={(status) => void onUpdate({ status: status as ProjectStatus })}
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={`Status for ${project.title}`}
          className="h-7 w-auto gap-1.5 border-0 bg-transparent px-1.5 text-xs shadow-none"
        >
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <Dot className={PROJECT_STATUS_META[project.status].dot} />
              {PROJECT_STATUS_META[project.status].label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((status) => (
            <SelectItem key={status} value={status}>
              <span className="flex items-center gap-1.5">
                <Dot className={PROJECT_STATUS_META[status].dot} />
                {PROJECT_STATUS_META[status].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectPrioritySelect({ project, onUpdate, disabled }: FieldProps) {
  return (
    <div onClick={stopPropagation} onPointerDown={stopPropagation}>
      <Select
        value={project.priority}
        onValueChange={(priority) =>
          void onUpdate({ priority: priority as ProjectPriority })
        }
        disabled={disabled}
      >
        <SelectTrigger
          aria-label={`Priority for ${project.title}`}
          className="h-7 w-auto gap-1.5 border-0 bg-transparent px-1.5 text-xs shadow-none"
        >
          <SelectValue>
            <span className={cn('flex items-center gap-1.5 font-medium', PROJECT_PRIORITY_META[project.priority].text)}>
              <Signal className="h-3.5 w-3.5" />
              {PROJECT_PRIORITY_META[project.priority].label}
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(PROJECT_PRIORITY_META) as ProjectPriority[]).map((priority) => (
            <SelectItem key={priority} value={priority}>
              <span className={cn('flex items-center gap-1.5', PROJECT_PRIORITY_META[priority].text)}>
                <Signal className="h-3.5 w-3.5" />
                {PROJECT_PRIORITY_META[priority].label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectLeadSelect({
  project,
  members,
  onUpdate,
  disabled,
}: FieldProps & { members: WorkspaceMemberDTO[] }) {
  const lead = members.find((member) => member.id === project.leadId);
  return (
    <div onClick={stopPropagation} onPointerDown={stopPropagation}>
      <Select
        value={project.leadId}
        onValueChange={(leadId) => void onUpdate({ leadId })}
        disabled={disabled || members.length === 0}
      >
        <SelectTrigger
          aria-label={`Lead for ${project.title}`}
          className="h-7 w-full min-w-0 gap-1.5 border-0 bg-transparent px-1.5 text-xs shadow-none"
        >
          <SelectValue>
            <span className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{lead?.name ?? lead?.email ?? 'Unknown lead'}</span>
            </span>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {members.map((member) => (
            <SelectItem key={member.id} value={member.id}>
              {member.name ?? member.email ?? member.id}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function ProjectDatePicker({
  project,
  field,
  onUpdate,
  disabled,
}: FieldProps & { field: 'startDate' | 'endDate' }) {
  const value = project[field] ? new Date(project[field]) : undefined;
  const isTarget = field === 'endDate';
  const boundary = isTarget
    ? project.startDate && new Date(project.startDate)
    : project.endDate && new Date(project.endDate);
  return (
    <div onClick={stopPropagation} onPointerDown={stopPropagation}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 max-w-full justify-start px-1.5 text-xs font-normal text-muted-foreground"
            disabled={disabled}
            aria-label={`${isTarget ? 'Target' : 'Start'} date for ${project.title}`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="truncate">
              {value ? format(value, 'MMM d, yyyy') : isTarget ? 'No target date' : 'No start date'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            disabled={(date) =>
              boundary
                ? isTarget
                  ? startOfDay(date) < startOfDay(boundary)
                  : startOfDay(date) > startOfDay(boundary)
                : false
            }
            onSelect={(date) => void onUpdate({ [field]: date ?? null })}
            initialFocus
          />
          <div className="flex justify-end border-t p-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => void onUpdate({ [field]: null })}>
              Clear
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
