'use client';

import { format } from 'date-fns';
import { CalendarDays, ExternalLink, Trash2, Users } from 'lucide-react';
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
    <div className="group flex flex-col gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-border/80">
      <div className="flex items-start justify-between gap-2">
        <Link
          href={ROUTES.app.project(project.id)}
          className="min-w-0 text-base font-medium hover:underline"
        >
          {project.title}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity hover:text-rose-500 group-hover:opacity-100"
          onClick={() => onDelete(project.id)}
          disabled={isDeleting}
          aria-label="Delete project"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {project.description ? (
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {project.description}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 text-xs">
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

      <div className="mt-auto flex items-center justify-between gap-2 border-t pt-3">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>{project.memberIds.length}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {project.startDate ? (
            <>
              <CalendarDays className="h-3.5 w-3.5" />
              <span>{format(new Date(project.startDate), 'MMM d')}</span>
            </>
          ) : (
            <span>No dates</span>
          )}
          {project.resources.length > 0 ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <ExternalLink className="h-3.5 w-3.5" />
              {project.resources.length}
            </span>
          ) : null}
        </div>
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
          <span className="text-[11px] text-muted-foreground">No members</span>
        )}
      </div>
    </div>
  );
}
