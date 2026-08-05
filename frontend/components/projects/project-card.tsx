'use client';

import { format } from 'date-fns';
import {
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  FolderKanban,
  Trash2,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/lib/routes';
import type { ProjectDTO } from '@/hooks/useProjects';
import type { WorkspaceMemberDTO } from '@/hooks/useWorkspaces';
import {
  PROJECT_PRIORITY_META,
  PROJECT_STATUS_META,
  Dot,
} from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

interface Props {
  project: ProjectDTO;
  members: WorkspaceMemberDTO[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

function userInitials(member: WorkspaceMemberDTO) {
  return (member.name ?? member.email ?? '?').slice(0, 2).toUpperCase();
}

export function ProjectCard({ project, members, onDelete, isDeleting }: Props) {
  const memberRows = project.memberIds
    .map((id) => members.find((member) => member.id === id))
    .filter((member) => member !== undefined);

  return (
    <li className="group grid gap-4 px-4 py-4 transition-colors hover:bg-muted/15 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center">
      <span className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-background text-muted-foreground transition-colors group-hover:text-foreground">
        <FolderKanban className="h-4 w-4" />
      </span>

      <div className="min-w-0 space-y-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Link
            href={ROUTES.app.project(project.id)}
            className="group/link inline-flex min-w-0 items-center gap-1.5 font-medium hover:underline"
          >
            <span className="truncate">{project.title}</span>
            <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/link:opacity-100" />
          </Link>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 ring-1 ring-inset',
              PROJECT_STATUS_META[project.status].ring,
            )}
          >
            <Dot className={PROJECT_STATUS_META[project.status].dot} />
            {PROJECT_STATUS_META[project.status].label}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-muted px-2 py-0.5 font-medium',
              PROJECT_PRIORITY_META[project.priority].text,
            )}
          >
            <Dot className={PROJECT_PRIORITY_META[project.priority].dot} />
            {PROJECT_PRIORITY_META[project.priority].label}
          </span>
        </div>

        {project.description ? (
          <p className="line-clamp-2 max-w-3xl text-sm leading-5 text-muted-foreground">
            {project.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            {project.memberIds.length} member{project.memberIds.length === 1 ? '' : 's'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" />
            {project.startDate ? (
              format(new Date(project.startDate), 'MMM d, yyyy')
            ) : (
              'No start date'
            )}
          </span>
          {project.resources.length > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5" />
              {project.resources.length} resource{project.resources.length === 1 ? '' : 's'}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 md:justify-end">
        {memberRows.length > 0 ? (
          <div className="flex -space-x-1.5">
            {memberRows.slice(0, 4).map((member) => (
              <span
                key={member.id}
                title={member.name ?? member.email ?? undefined}
                className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-background bg-muted text-[9px] font-semibold"
              >
                {userInitials(member)}
              </span>
            ))}
          </div>
        ) : (
          <span className="hidden text-[11px] text-muted-foreground lg:inline">Unassigned</span>
        )}
        <Button asChild type="button" variant="outline" size="sm">
          <Link href={ROUTES.app.project(project.id)}>Open</Link>
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
          onClick={() => onDelete(project.id)}
          disabled={isDeleting}
          aria-label={`Delete ${project.title}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
