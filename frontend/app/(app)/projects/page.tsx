'use client';

import { Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { FolderKanban, Plus } from 'lucide-react';
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
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectFormDialog } from '@/components/projects/project-form';
import { useCreateProject, useDeleteProject, useProjects } from '@/hooks/useProjects';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import type { CreateProjectInput } from '@/lib/validations/project.schema';
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
  const createProject = useCreateProject(activeWorkspaceId);
  const deleteProject = useDeleteProject(activeWorkspaceId);

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

  const deleteTargetProject = filtered.find((p) => p.id === deleteTarget) ?? null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Projects</h1>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4" /> New project
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search projects…"
          className="max-w-xs"
        />
        <Select value={status} onValueChange={(v) => setStatus(v as ProjectStatus | 'ALL')}>
          <SelectTrigger className="w-40">
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
          <SelectTrigger className="w-40">
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

      {projectsQuery.isLoading ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading projects…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project to organize tasks, resources, and updates in one place."
          action={{ label: 'Create your first project', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              members={membersQuery.data}
              onDelete={setDeleteTarget}
              isDeleting={deleteProject.isPending}
            />
          ))}
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
