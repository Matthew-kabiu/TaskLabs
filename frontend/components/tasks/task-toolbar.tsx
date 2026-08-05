'use client';

import { Plus, Search, Filter, SortAsc, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TaskListFilters } from '@/hooks/useTasks';

interface Props {
  filters: TaskListFilters;
  onFiltersChange: (next: TaskListFilters) => void;
  onNewTask: () => void;
  projects: { id: string; title: string }[];
  // Kanban groups by status and orders manually via drag-drop, so the
  // status filter and sort dropdown are inert there — hide them.
  showFilters?: boolean;
}

const ANY = '__any__';
const NO_PROJECT = '__none__';

export function TaskToolbar({ filters, onFiltersChange, onNewTask, projects, showFilters = true }: Props) {
  const update = (patch: Partial<TaskListFilters>) =>
    onFiltersChange({ ...filters, ...patch });

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-8"
          placeholder="Search tasks..."
          value={filters.q ?? ''}
          onChange={(e) => update({ q: e.target.value || undefined })}
        />
      </div>
      {showFilters && (
      <Select
        value={filters.status ?? ANY}
        onValueChange={(v) => update({ status: v === ANY ? undefined : (v as TaskListFilters['status']) })}
      >
        <SelectTrigger className="w-[140px]">
          <Filter className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any status</SelectItem>
          <SelectItem value="BACKLOG">Backlog</SelectItem>
          <SelectItem value="TODO">Todo</SelectItem>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="IN_REVIEW">In Review</SelectItem>
          <SelectItem value="DONE">Done</SelectItem>
          <SelectItem value="ARCHIVED">Archived</SelectItem>
          <SelectItem value="CANCELLED">Cancelled</SelectItem>
        </SelectContent>
      </Select>
      )}
      {showFilters && (
      <Select
        value={
          filters.projectId === undefined
            ? ANY
            : filters.projectId === null
              ? NO_PROJECT
              : filters.projectId
        }
        onValueChange={(v) => {
          if (v === ANY) update({ projectId: undefined });
          else if (v === NO_PROJECT) update({ projectId: null });
          else update({ projectId: v });
        }}
      >
        <SelectTrigger className="w-[150px]">
          <FolderKanban className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Project" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Any project</SelectItem>
          <SelectItem value={NO_PROJECT}>No project</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      )}
      {showFilters && (
      <Select
        value={filters.sort ?? 'manual'}
        onValueChange={(v) => update({ sort: v as TaskListFilters['sort'] })}
      >
        <SelectTrigger className="w-[140px]">
          <SortAsc className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Sort" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="manual">Manual</SelectItem>
          <SelectItem value="dueDate">Due date</SelectItem>
          <SelectItem value="priority">Priority</SelectItem>
          <SelectItem value="createdAt">Created</SelectItem>
          <SelectItem value="title">Title</SelectItem>
        </SelectContent>
      </Select>
      )}
      <Button type="button" onClick={onNewTask}>
        <Plus className="mr-1 h-4 w-4" />
        New Task
      </Button>
    </div>
  );
}
