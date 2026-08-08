'use client';

import * as React from 'react';
import { Check, ChevronsUpDown, FolderKanban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { ProjectStatus } from '@/hooks/useProjects';
import { Dot, PROJECT_STATUS_META } from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

type SwitcherProject = {
  id: string;
  title: string;
  status: ProjectStatus;
};

interface ProjectSwitcherProps {
  projects: SwitcherProject[];
  activeId: string | null;
  onSelect: (projectId: string) => void;
  compact?: boolean;
}

export function ProjectSwitcher({
  projects,
  activeId,
  onSelect,
  compact = false,
}: ProjectSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const active = projects.find((project) => project.id === activeId) ?? projects[0];
  const activeStatus = active ? PROJECT_STATUS_META[active.status] : null;

  const selectProject = (projectId: string) => {
    onSelect(projectId);
    setOpen(false);
  };

  return (
    <div className="min-w-0 space-y-2">
      {!compact ? (
        <div className="px-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Active project
          </span>
        </div>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant={compact ? 'ghost' : 'outline'}
          size={compact ? 'icon' : 'default'}
          role="combobox"
          aria-expanded={open}
          aria-label={compact ? `Active project: ${active?.title ?? 'None'}` : undefined}
          title={compact ? `Active project: ${active?.title ?? 'None'}` : undefined}
          data-status={active?.status}
          className={cn(
            compact
              ? 'h-8 w-8 ring-1'
              : 'w-full justify-between border-border/70 bg-background',
            compact && activeStatus?.surface,
            compact && activeStatus?.text,
            compact && activeStatus?.ring,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={cn(
                'grid h-6 w-6 shrink-0 place-items-center rounded-md ring-1',
                activeStatus?.surface ?? 'bg-muted',
                activeStatus?.text ?? 'text-muted-foreground',
                activeStatus?.ring ?? 'ring-border',
                compact && 'h-auto w-auto bg-transparent ring-0',
              )}
            >
              <FolderKanban className="h-3.5 w-3.5" />
            </span>
            {!compact ? (
              <span className="truncate">{active?.title ?? 'No projects'}</span>
            ) : null}
          </span>
          {!compact ? <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" /> : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-0"
        align="start"
        side={compact ? 'right' : 'bottom'}
      >
        <Command>
          <CommandInput placeholder="Search projects…" />
          <CommandList>
            <CommandEmpty>No projects found.</CommandEmpty>
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  value={project.title}
                  onSelect={() => selectProject(project.id)}
                >
                  <Check
                    className={project.id === active?.id ? 'opacity-100' : 'opacity-0'}
                  />
                  <span className="truncate">{project.title}</span>
                  <Dot className={cn('ml-auto', PROJECT_STATUS_META[project.status].dot)} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
      </Popover>
    </div>
  );
}
