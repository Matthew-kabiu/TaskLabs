'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  ArrowLeft,
  Activity,
  ChevronRight,
  Edit3,
  ExternalLink,
  FolderKanban,
  Link2,
  ListChecks,
  SlidersHorizontal,
  Star,
  Trash2,
  Users,
  ChartNoAxesColumnIncreasing,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  ProjectDatePicker,
  ProjectLeadSelect,
  ProjectPrioritySelect,
  ProjectStatusSelect,
} from '@/components/projects/project-inline-fields';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskRow } from '@/components/tasks/task-row';
import { ViewToggle, type TaskView } from '@/components/tasks/view-toggle';
import { ROUTES } from '@/lib/routes';
import {
  useProject,
  useDeleteProject,
  useSetProjectFavorite,
  useUpdateProject,
} from '@/hooks/useProjects';
import { useTasks, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import type { UpdateProjectInput } from '@/lib/validations/project.schema';
import {
  PROJECT_RESOURCE_TYPE_META,
  PROJECT_STATUS_META,
} from '@/lib/projects/meta';
import { cn } from '@/lib/utils';

function memberName(members: { id: string; name: string | null; email: string | null }[], id: string) {
  const member = members.find((m) => m.id === id);
  return member?.name ?? member?.email ?? null;
}

function PropertyLabel({
  icon: Icon,
  label,
  className,
}: {
  icon: LucideIcon;
  label: string;
  className: string;
}) {
  return (
    <span className="flex w-20 shrink-0 items-center gap-1.5 text-xs font-semibold text-foreground">
      <Icon className={cn('h-3.5 w-3.5', className)} />
      {label}
    </span>
  );
}

export default function ProjectDetailPage() {
  const params = useParams<{ projectId: string }>();
  const router = useRouter();
  const projectId = Array.isArray(params.projectId) ? params.projectId[0] : params.projectId;
  const { activeWorkspaceId } = useWorkspaces();
  const { data: project, isLoading } = useProject(projectId, activeWorkspaceId);
  const membersQuery = useWorkspaceMembers(activeWorkspaceId);
  const updateProject = useUpdateProject(activeWorkspaceId);
  const deleteProject = useDeleteProject(activeWorkspaceId);
  const setProjectFavorite = useSetProjectFavorite(activeWorkspaceId);
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
  const [taskView, setTaskView] = useState<TaskView>('kanban');
  const [activeTab, setActiveTab] = useState('overview');

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

  const handleInlineUpdate = async (input: UpdateProjectInput) => {
    try {
      await updateProject.mutateAsync({ id: project.id, input });
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleToggleComplete = async (id: string, status: 'TODO' | 'DONE') => {
    try {
      await updateTask.mutateAsync({ id, input: { status } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleFavorite = async () => {
    try {
      await setProjectFavorite.mutateAsync({
        id: project.id,
        isFavorite: !project.isFavorite,
      });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const completedTaskCount = projectTasks.filter((task) => task.status === 'DONE').length;
  const progress =
    projectTasks.length === 0
      ? 0
      : Math.round((completedTaskCount / projectTasks.length) * 100);

  return (
    <div className="flex min-h-0 flex-1 flex-col p-6">
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3">
        <div className="flex min-w-0 items-center gap-2 text-sm">
          <Link href={ROUTES.app.projects} className="shrink-0 text-muted-foreground hover:text-foreground">
            Projects
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <FolderKanban className={cn('h-3.5 w-3.5 shrink-0', PROJECT_STATUS_META[project.status].text)} />
          <span className="truncate font-medium">{project.title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={handleFavorite}
            disabled={setProjectFavorite.isPending}
            aria-label={project.isFavorite ? 'Remove project from favorites' : 'Add project to favorites'}
          >
            <Star className={cn('h-4 w-4', project.isFavorite && 'fill-current text-amber-500')} />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setEditOpen(true)}>
            <Edit3 className="mr-1.5 h-4 w-4" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="mr-1.5 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="min-h-0 flex-1">
        <TabsList className="mt-2 h-8 justify-start gap-1 bg-transparent p-0">
          <TabsTrigger value="overview" className="h-7 px-3 text-xs shadow-none">Overview</TabsTrigger>
          <TabsTrigger value="activity" className="h-7 px-3 text-xs shadow-none">Activity</TabsTrigger>
          <TabsTrigger value="issues" className="h-7 px-3 text-xs shadow-none">Issues</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-0">
          <div className="mx-auto w-full max-w-3xl space-y-7 py-10 lg:py-16">
            <div className="space-y-3">
              <span className={cn(
                'grid h-8 w-8 place-items-center rounded-md ring-1',
                PROJECT_STATUS_META[project.status].surface,
                PROJECT_STATUS_META[project.status].text,
                PROJECT_STATUS_META[project.status].ring,
              )}>
                <FolderKanban className="h-4 w-4" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
                {project.description ? (
                  <p className="mt-1.5 max-w-2xl whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {project.description}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PropertyLabel icon={SlidersHorizontal} label="Properties" className="text-sky-500" />
                <ProjectStatusSelect project={project} onUpdate={handleInlineUpdate} />
                <ProjectPrioritySelect project={project} onUpdate={handleInlineUpdate} />
                <ProjectLeadSelect project={project} members={membersQuery.data} onUpdate={handleInlineUpdate} />
                <ProjectDatePicker project={project} field="startDate" onUpdate={handleInlineUpdate} />
                <span aria-hidden className="text-xs text-muted-foreground">→</span>
                <ProjectDatePicker project={project} field="endDate" onUpdate={handleInlineUpdate} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PropertyLabel icon={Users} label="Team" className="text-emerald-500" />
                {project.memberIds.length > 0 ? project.memberIds.map((id) => (
                  <span key={id} className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground">
                    {memberName(membersQuery.data, id) ?? 'Unknown member'}
                  </span>
                )) : <span className="text-xs text-muted-foreground">No additional members</span>}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PropertyLabel icon={Link2} label="Resources" className="text-violet-500" />
                {project.resources.length > 0 ? project.resources.map((resource, index) => {
                  const ResourceIcon = PROJECT_RESOURCE_TYPE_META[resource.type]?.icon ?? Link2;
                  return (
                    <a
                      key={`${resource.label}-${index}`}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                    >
                      <ResourceIcon className="h-3.5 w-3.5" />
                      {resource.label}
                      <ExternalLink className="h-3 w-3 text-muted-foreground" />
                    </a>
                  );
                }) : <span className="text-xs text-muted-foreground">No resources</span>}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <PropertyLabel icon={ChartNoAxesColumnIncreasing} label="Progress" className="text-amber-500" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {completedTaskCount} of {projectTasks.length} issues complete
                </span>
                <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted" aria-label={`${progress}% complete`}>
                  <div className="h-full rounded-full bg-amber-500" style={{ width: `${progress}%` }} />
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">{progress}%</span>
              </div>
            </div>

            <ProjectUpdates
              projectId={project.id}
              workspaceId={project.workspaceId}
              members={membersQuery.data}
              mode="overview"
              onRequestUpdate={() => setActiveTab('activity')}
            />
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-0">
          <section className="mx-auto w-full max-w-5xl space-y-4 py-8">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-md bg-sky-500/10 text-sky-500 ring-1 ring-sky-500/20">
                <Activity className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-medium">Project activity</h2>
                <p className="text-xs text-muted-foreground">Share progress and decisions with the project team.</p>
              </div>
            </div>
            <ProjectUpdates
              projectId={project.id}
              workspaceId={project.workspaceId}
              members={membersQuery.data}
            />
          </section>
        </TabsContent>

        <TabsContent value="issues" className="mt-0">
          <section className="flex flex-col gap-3 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <ListChecks className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-sm font-medium">Project issues</h2>
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
          <div className="min-h-[32rem] overflow-hidden rounded-md border border-border/60">
            <KanbanBoard
              filters={{ projectId }}
              projects={{ [project.id]: project.title }}
              onOpenTask={(id) => router.push(ROUTES.app.task(id))}
            />
          </div>
        ) : tasksQuery.isLoading ? (
          <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
            Loading tasks…
          </div>
        ) : projectTasks.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 p-6 text-center">
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
                onOpen={(id) => router.push(ROUTES.app.task(id))}
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
        </TabsContent>
      </Tabs>

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
