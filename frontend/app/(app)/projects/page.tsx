'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FolderKanban, Plus, Search, SlidersHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { ProjectRow } from '@/components/projects/project-row';
import { ProjectFormDialog } from '@/components/projects/project-form';
import {
  useCreateProject,
  useDeleteProject,
  useProjects,
  useSetProjectFavorite,
  useUpdateProject,
} from '@/hooks/useProjects';
import { useTasks } from '@/hooks/useTasks';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import type { CreateProjectInput } from '@/lib/validations/project.schema';
import type { UpdateProjectInput } from '@/lib/validations/project.schema';
import {
  PROJECT_PRIORITY_META,
  PROJECT_STATUS_META,
} from '@/lib/projects/meta';
import type { ProjectPriority, ProjectStatus } from '@/hooks/useProjects';

function isProjectStatus(value: string | null): value is ProjectStatus {
  return value !== null && value in PROJECT_STATUS_META;
}

function ProjectsPageContent() {
  const searchParams = useSearchParams();
  const statusParam = searchParams?.get('status') ?? null;
  const { activeWorkspaceId } = useWorkspaces();
  const [status, setStatus] = useState<ProjectStatus | 'ALL'>(() =>
    isProjectStatus(statusParam) ? statusParam : 'ALL',
  );
  const [priority, setPriority] = useState<ProjectPriority | 'ALL'>('ALL');
  const [q, setQ] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const projectsQuery = useProjects(
    {
      status: status === 'ALL' ? undefined : status,
      priority: priority === 'ALL' ? undefined : priority,
    },
    activeWorkspaceId,
  );
  const membersQuery = useWorkspaceMembers(activeWorkspaceId);
  const tasksQuery = useTasks({}, activeWorkspaceId);
  const createProject = useCreateProject(activeWorkspaceId);
  const deleteProject = useDeleteProject(activeWorkspaceId);
  const setProjectFavorite = useSetProjectFavorite(activeWorkspaceId);
  const updateProject = useUpdateProject(activeWorkspaceId);

  const filtered = useMemo(() => {
    const projects = projectsQuery.data ?? [];
    const query = q.trim().toLowerCase();
    if (query.length < 1) return projects;
    return projects.filter(
      (project) =>
        project.title.toLowerCase().includes(query) ||
        (project.description ?? '').toLowerCase().includes(query),
    );
  }, [projectsQuery.data, q]);

  const taskStatsByProject = useMemo(() => {
    if (tasksQuery.data === undefined) return null;
    const stats: Record<string, { total: number; completed: number }> = {};
    for (const task of tasksQuery.data) {
      if (!task.projectId) continue;
      const current = stats[task.projectId] ?? { total: 0, completed: 0 };
      current.total += 1;
      if (task.status === 'DONE') current.completed += 1;
      stats[task.projectId] = current;
    }
    return stats;
  }, [tasksQuery.data]);

  const handleCreate = async (input: CreateProjectInput) => {
    try {
      await createProject.mutateAsync(input);
      toast.success('Project created');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject.mutateAsync(id);
      toast.success('Project deleted');
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleFavorite = async (id: string, isFavorite: boolean) => {
    try {
      await setProjectFavorite.mutateAsync({ id, isFavorite });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleInlineUpdate = async (id: string, input: UpdateProjectInput) => {
    try {
      await updateProject.mutateAsync({ id, input });
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const deleteTargetProject = filtered.find((p) => p.id === deleteTarget) ?? null;

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <header className="flex h-10 shrink-0 items-center justify-between border-b border-border/60 pb-3">
        <h1 className="text-sm font-semibold">Projects</h1>
        <Button size="sm" variant="ghost" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </header>

      <div className="flex flex-col gap-3 border-b border-border/60 py-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-7 items-center rounded-md bg-muted px-2.5 text-xs font-medium">
            All projects
          </span>
          <span className="text-xs tabular-nums text-muted-foreground">
            {filtered.length}
          </span>
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative min-w-0 sm:w-56">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="h-8 pl-8 text-xs"
            />
          </div>
          <span className="hidden items-center gap-1 text-xs text-muted-foreground lg:flex">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filter
          </span>
          <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | 'ALL')}>
            <SelectTrigger aria-label="Filter projects by status" className="h-8 w-full text-xs sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All statuses</SelectItem>
              {(Object.keys(PROJECT_STATUS_META) as ProjectStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {PROJECT_STATUS_META[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={(v) => setPriority(v as ProjectPriority | 'ALL')}>
            <SelectTrigger aria-label="Filter projects by priority" className="h-8 w-full text-xs sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All priorities</SelectItem>
              {(Object.keys(PROJECT_PRIORITY_META) as ProjectPriority[]).map((p) => (
                <SelectItem key={p} value={p}>
                  {PROJECT_PRIORITY_META[p].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {projectsQuery.isLoading ? (
        <div className="mt-4 rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to organize tasks, resources, and updates in one place."
            action={{ label: 'Create your first project', onClick: () => setCreateOpen(true) }}
          />
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-x-auto">
          <table className="w-full table-fixed border-collapse" aria-label="Projects portfolio">
            <thead>
              <tr className="border-b border-border/60 text-left text-[11px] font-medium text-muted-foreground">
                <th className="w-auto px-3 py-2 font-medium sm:px-4">Name</th>
                <th className="hidden w-28 px-3 py-2 font-medium md:table-cell">Health</th>
                <th className="hidden w-24 px-3 py-2 font-medium lg:table-cell">Priority</th>
                <th className="hidden w-44 px-3 py-2 font-medium xl:table-cell">Lead</th>
                <th className="hidden w-36 px-3 py-2 font-medium xl:table-cell">Target date</th>
                <th className="hidden w-16 px-3 py-2 text-right font-medium md:table-cell">Issues</th>
                <th className="w-20 px-3 py-2 text-right font-medium">Status</th>
                <th className="w-16 px-1 py-2"><span className="sr-only">Favorite and actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((project) => {
                const taskStats = taskStatsByProject?.[project.id];
                return (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    members={membersQuery.data}
                    onDelete={setDeleteTarget}
                    isDeleting={deleteProject.isPending}
                    taskCount={taskStatsByProject === null ? undefined : taskStats?.total ?? 0}
                    completedTaskCount={
                      taskStatsByProject === null ? undefined : taskStats?.completed ?? 0
                    }
                    onFavorite={handleFavorite}
                    isFavoritePending={setProjectFavorite.isPending}
                    onUpdate={handleInlineUpdate}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ProjectFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        project={null}
        members={membersQuery.data}
        onCreate={handleCreate}
        onUpdate={async () => {}}
      />

      <Dialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              Deleting “{deleteTargetProject?.title ?? 'this project'}” also deletes
              every task inside it. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteProject.isPending}
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense fallback={null}>
      <ProjectsPageContent />
    </Suspense>
  );
}
