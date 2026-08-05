'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, Edit3, ExternalLink, FolderKanban, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/empty-state';
import { ProjectFormDialog } from '@/components/projects/project-form';
import { ProjectUpdates } from '@/components/projects/project-updates';
import { TaskRow } from '@/components/tasks/task-row';
import { ROUTES } from '@/lib/routes';
import { useProject, useDeleteProject, useUpdateProject } from '@/hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import type { UpdateProjectInput } from '@/lib/validations/project.schema';
import {
  PROJECT_PRIORITY_META,
  PROJECT_RESOURCE_TYPE_META,
  PROJECT_STATUS_META,
  Dot,
} from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

function memberName(members: { id: string; name: string | null; email: string | null }[], id: string) {
  const member = members.find((m) => m.id === id);
  return member?.name ?? member?.email ?? null;
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const { activeWorkspaceId } = useWorkspaces();
  const { data: project, isLoading } = useProject(projectId, activeWorkspaceId);
  const membersQuery = useWorkspaceMembers(activeWorkspaceId);
  const updateProject = useUpdateProject(activeWorkspaceId);
  const deleteProject = useDeleteProject(activeWorkspaceId);
  const updateTask = useUpdateTask(activeWorkspaceId);
  const deleteTask = useDeleteTask(activeWorkspaceId);

  const tasksQuery = useTasks({ projectId }, activeWorkspaceId);
  const projectTasks = useMemo(
    () => (tasksQuery.data ?? []).filter((task) => task.projectId === projectId),
    [tasksQuery.data, projectId],
  );

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading project…
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <Link href={ROUTES.app.projects} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <EmptyState
          icon={FolderKanban}
          title="Project not found"
          description="It may have been deleted, or you may not have access to it."
          action={{ label: 'Back to projects', onClick: () => {} }}
        />
      </div>
    );
  }

  const handleSave = async (id: string, input: UpdateProjectInput) => {
    try {
      await updateProject.mutateAsync({ id, input });
      toast.success('Project updated');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject.mutateAsync(project.id);
      toast.success('Project deleted');
      window.location.href = ROUTES.app.projects;
    } catch (err) {
      toast.error((err as Error).message);
      setDeleting(false);
    }
  };

  const handleToggleComplete = async (id: string, status: 'TODO' | 'DONE') => {
    try {
      await updateTask.mutateAsync({ id, input: { status } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <Link href={ROUTES.app.projects} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
            <Edit3 className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-rose-500 hover:bg-rose-500/10 hover:text-rose-500"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <header className="flex flex-col gap-3 rounded-lg border bg-card p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs ring-1 ring-inset',
              PROJECT_STATUS_META[project.status].ring,
            )}
          >
            <Dot className={PROJECT_STATUS_META[project.status].dot} />
            {PROJECT_STATUS_META[project.status].label}
          </span>
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium',
              PROJECT_PRIORITY_META[project.priority].text,
            )}
          >
            <Dot className={PROJECT_PRIORITY_META[project.priority].dot} />
            {PROJECT_PRIORITY_META[project.priority].label}
          </span>
        </div>

        {project.description ? (
          <p className="max-w-3xl whitespace-pre-wrap text-sm text-muted-foreground">
            {project.description}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <CalendarDays className="h-4 w-4" />
            {project.startDate
              ? format(new Date(project.startDate), 'MMM d, yyyy')
              : 'No start date'}
            {project.endDate
              ? ` — ${format(new Date(project.endDate), 'MMM d, yyyy')}`
              : null}
          </span>
          <span className="text-muted-foreground">
            {project.memberIds.length} member{project.memberIds.length === 1 ? '' : 's'}
          </span>
        </div>

        {project.memberIds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {project.memberIds.map((id) => {
              const name = memberName(membersQuery.data, id);
              return (
                <span
                  key={id}
                  className="inline-flex items-center rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                >
                  {name ?? 'Unknown member'}
                </span>
              );
            })}
          </div>
        ) : null}

        {project.resources.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {project.resources.map((resource, index) => (
              <a
                key={`${resource.label}-${index}`}
                href={resource.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-3 w-3" />
                {PROJECT_RESOURCE_TYPE_META[resource.type]?.label ?? resource.type}
                {resource.label ? ` · ${resource.label}` : ''}
              </a>
            ))}
          </div>
        ) : null}
      </header>

      <ProjectUpdates
        projectId={project.id}
        workspaceId={project.workspaceId}
        members={membersQuery.data}
      />

      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-medium">Tasks</h2>
          <Link
            href={ROUTES.app.tasks}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
          </Link>
        </div>
        {tasksQuery.isLoading ? (
          <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
            Loading tasks…
          </div>
        ) : projectTasks.length === 0 ? (
          <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            No tasks in this project yet. Create one from the Tasks page and assign
            it to this project.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {projectTasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                selected={false}
                onOpen={() => {
                  toast.info('Open the Tasks page to edit this task.');
                }}
                onSelect={() => {}}
                onDelete={async (id) => {
                  try {
                    await deleteTask.mutateAsync(id);
                    toast.success('Task deleted');
                  } catch (err) {
                    toast.error((err as Error).message);
                  }
                }}
                onToggleComplete={handleToggleComplete}
              />
            ))}
          </div>
        )}
      </section>

      <ProjectFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        project={project}
        members={membersQuery.data}
        onCreate={async () => {}}
        onUpdate={handleSave}
      />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project?</DialogTitle>
            <DialogDescription>
              Deleting “{project.title}” also deletes every task inside it and its
              updates. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete project'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
