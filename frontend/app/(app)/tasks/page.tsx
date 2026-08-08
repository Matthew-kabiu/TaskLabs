'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FolderKanban } from 'lucide-react';
import {
  endOfDay,
  endOfWeek,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { toast } from 'sonner';
import { TaskList } from '@/components/tasks/task-list';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskToolbar } from '@/components/tasks/task-toolbar';
import { TaskSidePanel } from '@/components/tasks/task-side-panel';
import { TaskDeleteDialog } from '@/components/tasks/task-delete-dialog';
import { ViewToggle } from '@/components/tasks/view-toggle';
import { EmptyState } from '@/components/empty-state';
import { useTasksView } from '@/lib/hooks/use-tasks-view';
import { useTaskPanel } from '@/lib/stores/task-panel';
import {
  useCreateTask,
  useDeleteTask,
  useDeleteTasks,
  useTask,
  useTasks,
  useUpdateTask,
  type TaskDTO,
} from '@/hooks/useTasks';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import { useProjects } from '@/hooks/useProjects';
import { useActiveProject } from '@/hooks/useActiveProject';
import type { TaskListFilters } from '@/hooks/useTasks';
import { ROUTES } from '@/lib/routes';

type DashboardTaskView = 'today' | 'overdue' | 'done-this-week';

const DASHBOARD_VIEW_LABELS: Record<DashboardTaskView, string> = {
  today: 'Due today',
  overdue: 'Overdue',
  'done-this-week': 'Done this week',
};

function isDashboardTaskView(value: string | null): value is DashboardTaskView {
  return value === 'today' || value === 'overdue' || value === 'done-this-week';
}

function TasksPageContent() {
  const searchParams = useSearchParams();
  const viewParam = searchParams?.get('view') ?? null;
  const dashboardView = isDashboardTaskView(viewParam) ? viewParam : null;
  const taskParam = searchParams?.get('task') ?? null;
  const [filters, setFilters] = useState<TaskListFilters>({ sort: 'manual' });
  const [createOpen, setCreateOpen] = useState(false);
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { activeWorkspaceId } = useWorkspaces();
  const { view, setView } = useTasksView();
  const openId = useTaskPanel((s) => s.taskId);
  const openPanel = useTaskPanel((s) => s.open);
  const closePanel = useTaskPanel((s) => s.close);
  const membersQuery = useWorkspaceMembers(activeWorkspaceId);
  const projectsQuery = useProjects({}, activeWorkspaceId);
  const { activeProject, activeProjectId, setActiveProjectId } = useActiveProject(
    projectsQuery.data,
    activeWorkspaceId,
  );
  const linkedTaskQuery = useTask(taskParam, activeWorkspaceId);
  const scopedFilters = useMemo<TaskListFilters>(
    () => ({ ...filters, projectId: activeProjectId ?? undefined }),
    [activeProjectId, filters],
  );
  const tasksQuery = useTasks(
    scopedFilters,
    activeWorkspaceId,
    Boolean(activeProjectId),
  );
  useEffect(() => {
    const linkedProjectId = linkedTaskQuery.data?.projectId;
    if (
      linkedProjectId &&
      projectsQuery.data?.some((project) => project.id === linkedProjectId)
    ) {
      setActiveProjectId(linkedProjectId);
    }
  }, [linkedTaskQuery.data?.projectId, projectsQuery.data, setActiveProjectId]);

  useEffect(() => {
    if (taskParam) openPanel(taskParam);
  }, [activeProjectId, openPanel, taskParam]);

  const createTask = useCreateTask(activeWorkspaceId);
  const updateTask = useUpdateTask(activeWorkspaceId);
  const deleteTask = useDeleteTask(activeWorkspaceId);
  const deleteTasks = useDeleteTasks(activeWorkspaceId);

  const handleCreate = async (input: Parameters<typeof createTask.mutateAsync>[0]) => {
    if (!activeProjectId) return;
    try {
      await createTask.mutateAsync({
        ...input,
        projectId: input.projectId ?? activeProjectId,
      });
      toast.success('Task created');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleNewTask = () => {
    closePanel();
    setCreateOpen(true);
  };

  const handleToggleComplete = async (id: string, status: 'TODO' | 'DONE') => {
    try {
      await updateTask.mutateAsync({ id, input: { status } });
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleSave = async (id: string, input: Parameters<typeof updateTask.mutateAsync>[0]['input']) => {
    try {
      await updateTask.mutateAsync({ id, input });
      toast.success('Task updated');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteTask.mutateAsync(id);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(id);
        return next;
      });
      toast.success('Task deleted');
    } catch (err) {
      toast.error((err as Error).message);
      throw err;
    }
  };

  const handleDeleteSelected = async () => {
    // Single pass: filter + map collapsed into one traversal.
    const ids = tasks.flatMap((task) =>
      selectedIds.has(task.id) ? [task.id] : [],
    );
    if (ids.length === 0) return;
    try {
      const result = await deleteTasks.mutateAsync(ids);
      setSelectedIds(new Set());
      toast.success(`${result.deleted} task${result.deleted === 1 ? '' : 's'} deleted`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const now = useMemo(() => new Date(), []);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const tasks: TaskDTO[] = (tasksQuery.data ?? []).filter((task) => {
    if (dashboardView === null) return true;
    const dueDate = task.dueDate ? new Date(task.dueDate) : null;
    if (dashboardView === 'today') {
      return (
        dueDate !== null &&
        !isBefore(dueDate, todayStart) &&
        !isAfter(dueDate, todayEnd)
      );
    }
    if (dashboardView === 'overdue') {
      return dueDate !== null && task.status !== 'DONE' && isBefore(dueDate, todayStart);
    }
    const completedAt = task.completedAt ? new Date(task.completedAt) : null;
    return (
      completedAt !== null &&
      !isBefore(completedAt, weekStart) &&
      !isAfter(completedAt, weekEnd)
    );
  });
  const selectedCount = tasks.filter((task) => selectedIds.has(task.id)).length;
  const openTask = openId
    ? tasks.find((task) => task.id === openId) ??
      (linkedTaskQuery.data?.id === openId ? linkedTaskQuery.data : null)
    : null;
  const projectById = Object.fromEntries(
    (projectsQuery.data ?? []).map((project) => [project.id, project.title]),
  );

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Tasks</h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {projectsQuery.isLoading
              ? 'Loading project…'
              : activeProject?.title ?? 'No active project'}
          </p>
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <TaskToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onNewTask={handleNewTask}
        newTaskDisabled={!activeProjectId}
        showFilters={view !== 'kanban'}
      />

      {dashboardView ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-sm">
          <span>
            Showing dashboard view:{' '}
            <strong>{DASHBOARD_VIEW_LABELS[dashboardView]}</strong>
            {activeProject ? ` in ${activeProject.title}` : ''}
          </span>
          <Link
            href={ROUTES.app.tasks}
            className="shrink-0 text-muted-foreground hover:text-foreground hover:underline"
          >
            Clear view
          </Link>
        </div>
      ) : null}

      {projectsQuery.isLoading ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading project…
        </div>
      ) : !activeProjectId ? (
        <div className="rounded-md border border-border/60">
          <EmptyState
            icon={FolderKanban}
            title="No project selected"
            description="Create a project, then select it from the sidebar to manage its tasks."
            action={null}
          />
        </div>
      ) : view === 'kanban' ? (
        <KanbanBoard
          filters={scopedFilters}
          projects={projectById}
          enabled={Boolean(activeProjectId)}
        />
      ) : tasksQuery.isLoading ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          Loading tasks…
        </div>
      ) : tasksQuery.isError ? (
        <div className="rounded-md border border-destructive/30 p-8 text-center text-sm text-destructive">
          {tasksQuery.error?.message}
        </div>
      ) : (
        <TaskList
          tasks={tasks}
          selectedIds={selectedIds}
          onOpen={openPanel}
          onSelectionChange={setSelectedIds}
          onDelete={handleDelete}
          onDeleteSelected={async () => setBatchDeleteOpen(true)}
          onToggleComplete={handleToggleComplete}
          isDeleting={deleteTasks.isPending}
          projects={projectById}
        />
      )}

      <TaskSidePanel
        key={createOpen ? `create-${activeProjectId}` : openTask?.id ?? 'closed'}
        open={createOpen || Boolean(openTask)}
        task={openTask}
        members={membersQuery.data.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email ?? '',
        }))}
        labels={[]}
        projects={projectsQuery.data?.map((project) => ({
          id: project.id,
          title: project.title,
        })) ?? []}
        defaultProjectId={activeProjectId}
        onClose={() => {
          setCreateOpen(false);
          closePanel();
        }}
        onCreate={handleCreate}
        onSave={handleSave}
        onDelete={handleDelete}
      />
      <TaskDeleteDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        count={selectedCount}
        onConfirm={handleDeleteSelected}
      />
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksPageContent />
    </Suspense>
  );
}
