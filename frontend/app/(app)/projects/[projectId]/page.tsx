'use client';

import { useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  CalendarDays,
  Edit3,
  ExternalLink,
  FolderKanban,
  Link2,
  ListChecks,
  MessageSquareText,
  Trash2,
  Users,
} from 'lucide-react';
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
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskRow } from '@/components/tasks/task-row';
import { ViewToggle, type TaskView } from '@/components/tasks/view-toggle';
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
  const [taskView, setTaskView] = useState<TaskView>('list');

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
      <div className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href={ROUTES.app.projects} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All projects
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

      <header className="overflow-hidden rounded-xl border border-border/60 bg-card/30">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-5 p-5 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                <FolderKanban className="h-5 w-5" />
              </span>
              <div className="min-w-0 space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{project.title}</h1>
                <div className="flex flex-wrap items-center gap-2">
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
              </div>
            </div>

            {project.description ? (
              <p className="max-w-4xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                {project.description}
              </p>
            ) : null}

            {project.memberIds.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5" /> Team
                </span>
                {project.memberIds.map((id) => {
                  const name = memberName(membersQuery.data, id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground"
                    >
                      {name ?? 'Unknown member'}
                    </span>
                  );
                })}
              </div>
            ) : null}

            {project.resources.length > 0 ? (
              <div className="space-y-2">
                <p className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Link2 className="h-3.5 w-3.5" /> Resources
                </p>
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {project.resources.map((resource, index) => {
                    const ResourceIcon = PROJECT_RESOURCE_TYPE_META[resource.type]?.icon ?? Link2;
                    return (
                      <a
                        key={`${resource.label}-${index}`}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group/resource flex min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                      >
                        <ResourceIcon className="h-3.5 w-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">
                          {resource.label || PROJECT_RESOURCE_TYPE_META[resource.type]?.label || resource.type}
                        </span>
                        <span className="shrink-0 text-[10px] uppercase tracking-[0.1em] text-muted-foreground/70">
                          {PROJECT_RESOURCE_TYPE_META[resource.type]?.label ?? resource.type}
                        </span>
                        <ExternalLink className="h-3 w-3 shrink-0 opacity-50 transition-opacity group-hover/resource:opacity-100" />
                      </a>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="grid grid-cols-2 divide-x divide-y divide-border/60 border-t border-border/60 bg-muted/15 lg:grid-cols-1 lg:divide-x-0 lg:border-l lg:border-t-0">
            <div className="space-y-1 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="h-3.5 w-3.5" /> Timeline</p>
              <p className="text-sm font-medium">
                {project.startDate ? format(new Date(project.startDate), 'MMM d, yyyy') : 'Not scheduled'}
              </p>
              {project.endDate ? <p className="text-xs text-muted-foreground">to {format(new Date(project.endDate), 'MMM d, yyyy')}</p> : null}
            </div>
            <div className="space-y-1 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Users className="h-3.5 w-3.5" /> Team</p>
              <p className="text-2xl font-semibold tabular-nums">{project.memberIds.length}</p>
              <p className="text-xs text-muted-foreground">assigned member{project.memberIds.length === 1 ? '' : 's'}</p>
            </div>
            <div className="space-y-1 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><ListChecks className="h-3.5 w-3.5" /> Tasks</p>
              <p className="text-2xl font-semibold tabular-nums">{projectTasks.length}</p>
              <p className="text-xs text-muted-foreground">linked to this project</p>
            </div>
            <div className="space-y-1 p-4">
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Link2 className="h-3.5 w-3.5" /> Resources</p>
              <p className="text-2xl font-semibold tabular-nums">{project.resources.length}</p>
              <p className="text-xs text-muted-foreground">reference link{project.resources.length === 1 ? '' : 's'}</p>
            </div>
          </aside>
        </div>
      </header>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquareText className="h-4 w-4 text-muted-foreground" />
          <div>
            <h2 className="text-base font-medium">Project updates</h2>
            <p className="text-xs text-muted-foreground">Share progress and decisions with the project team.</p>
          </div>
        </div>
        <ProjectUpdates
          projectId={project.id}
          workspaceId={project.workspaceId}
          members={membersQuery.data}
        />
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-muted-foreground" />
            <div>
              <h2 className="text-base font-medium">Project tasks</h2>
              <p className="text-xs text-muted-foreground">Execution work assigned to this project.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {projectTasks.length} task{projectTasks.length === 1 ? '' : 's'}
            </span>
            <ViewToggle value={taskView} onChange={setTaskView} />
          </div>
        </div>
        {taskView === 'kanban' ? (
          <div className="min-h-[32rem] overflow-hidden rounded-xl border border-border/60 bg-card/20">
            <KanbanBoard
              filters={{ projectId }}
              projects={{ [project.id]: project.title }}
            />
          </div>
        ) : tasksQuery.isLoading ? (
          <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
            Loading tasks…
          </div>
        ) : projectTasks.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-card/20 p-6 text-center">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground"><ListChecks className="h-4 w-4" /></span>
            <p className="text-sm font-medium">No project tasks yet</p>
            <p className="max-w-md text-xs text-muted-foreground">Create a task from the Tasks page and assign it to this project.</p>
            <Button asChild variant="outline" size="sm" className="mt-1"><Link href={ROUTES.app.tasks}>Open Tasks</Link></Button>
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
                projects={{ [project.id]: project.title }}
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
