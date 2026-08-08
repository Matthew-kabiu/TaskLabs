'use client';

import {
  FolderKanban,
  MoreHorizontal,
  Star,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ROUTES } from '@/lib/routes';
import type { ProjectDTO } from '@/hooks/useProjects';
import type { WorkspaceMemberDTO } from '@/hooks/useWorkspaces';
import type { UpdateProjectInput } from '@/lib/validations/project.schema';
import {
  ProjectDatePicker,
  ProjectLeadSelect,
  ProjectPrioritySelect,
  ProjectStatusSelect,
} from '@/components/projects/project-inline-fields';
import { cn } from '@/lib/utils';

interface Props {
  project: ProjectDTO;
  members: WorkspaceMemberDTO[];
  onDelete: (id: string) => void;
  isDeleting: boolean;
  taskCount?: number;
  completedTaskCount?: number;
  onFavorite: (id: string, isFavorite: boolean) => void;
  isFavoritePending: boolean;
  onUpdate: (id: string, input: UpdateProjectInput) => Promise<void>;
}

export function ProjectRow({
  project,
  members,
  onDelete,
  isDeleting,
  taskCount,
  completedTaskCount,
  onFavorite,
  isFavoritePending,
  onUpdate,
}: Props) {
  const router = useRouter();
  const updateField = (input: UpdateProjectInput) => onUpdate(project.id, input);
  const progress =
    taskCount === undefined || completedTaskCount === undefined
      ? null
      : taskCount === 0
        ? 0
        : Math.round((completedTaskCount / taskCount) * 100);

  return (
    <tr
      className="group cursor-pointer border-b border-border/60 transition-colors last:border-b-0 hover:bg-muted/30"
      onClick={() => router.push(ROUTES.app.project(project.id))}
    >
      <td className="min-w-0 px-3 py-2.5 sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border bg-background text-muted-foreground">
            <FolderKanban className="h-3.5 w-3.5" />
          </span>
          <Link
            href={ROUTES.app.project(project.id)}
            className="min-w-0 flex-1"
          >
            <span className="block truncate text-sm font-medium text-foreground group-hover:underline">
              {project.title}
            </span>
            {project.description ? (
              <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                {project.description}
              </span>
            ) : null}
          </Link>
        </div>
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2.5 md:table-cell">
        <ProjectStatusSelect project={project} onUpdate={updateField} />
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2.5 lg:table-cell">
        <ProjectPrioritySelect project={project} onUpdate={updateField} />
      </td>

      <td className="hidden min-w-0 px-3 py-2.5 xl:table-cell">
        <ProjectLeadSelect project={project} members={members} onUpdate={updateField} />
      </td>

      <td className="hidden whitespace-nowrap px-3 py-2.5 xl:table-cell">
        <ProjectDatePicker project={project} field="endDate" onUpdate={updateField} />
      </td>

      <td className="hidden px-3 py-2.5 text-right text-xs tabular-nums text-muted-foreground md:table-cell">
        {taskCount ?? '—'}
      </td>

      <td className="whitespace-nowrap px-3 py-2.5">
        <div
          className="flex items-center justify-end gap-2"
          aria-label={progress === null ? 'Progress loading' : `${progress}% complete`}
        >
          <span className="relative h-3.5 w-3.5 rounded-full border border-muted-foreground/40">
            {progress !== null && progress > 0 ? (
              <span
                className="absolute inset-[2px] rounded-full bg-foreground"
                style={{ opacity: Math.max(progress / 100, 0.2) }}
              />
            ) : null}
          </span>
          <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
            {progress === null ? '—' : `${progress}%`}
          </span>
        </div>
      </td>

      <td className="w-16 px-1 py-2.5 pr-2 text-right">
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={(event) => {
              event.stopPropagation();
              onFavorite(project.id, !project.isFavorite);
            }}
            disabled={isFavoritePending}
            aria-label={project.isFavorite ? `Unfavorite ${project.title}` : `Favorite ${project.title}`}
          >
            <Star className={cn('h-3.5 w-3.5', project.isFavorite && 'fill-current text-amber-500')} />
          </Button>
          <div onClick={(event) => event.stopPropagation()}>
          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 md:data-[state=open]:opacity-100"
              disabled={isDeleting}
              aria-label={`Project actions for ${project.title}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={ROUTES.app.project(project.id)}>Open project</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(project.id)}
            >
              <Trash2 className="h-4 w-4" />
              Delete project
            </DropdownMenuItem>
          </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </td>
    </tr>
  );
}
