'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { TaskList } from '@/components/tasks/task-list';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskToolbar } from '@/components/tasks/task-toolbar';
import { TaskSidePanel } from '@/components/tasks/task-side-panel';
import { ViewToggle } from '@/components/tasks/view-toggle';
import { useTasksView } from '@/lib/hooks/use-tasks-view';
import { useTaskPanel } from '@/lib/stores/task-panel';
import {
  useCreateTask,
  useDeleteTask,
  useTasks,
  useUpdateTask,
  type TaskDTO,
} from '@/hooks/useTasks';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import type { ListTasksQuery } from '@/lib/validations/task.schema';
import type { QuickAddResult } from '@/lib/tasks/quick-parse';

export default function TasksPage() {
  const [filters, setFilters] = useState<Partial<ListTasksQuery>>({ sort: 'manual' });
  const { activeWorkspaceId } = useWorkspaces();
  const { view, setView } = useTasksView();
  const openId = useTaskPanel((s) => s.taskId);
  const openPanel = useTaskPanel((s) => s.open);
  const closePanel = useTaskPanel((s) => s.close);

  const tasksQuery = useTasks(filters, activeWorkspaceId);
  const membersQuery = useWorkspaceMembers(activeWorkspaceId);

  const createTask = useCreateTask(activeWorkspaceId);
  const updateTask = useUpdateTask(activeWorkspaceId);
  const deleteTask = useDeleteTask(activeWorkspaceId);

  const handleQuickCreate = async (parsed: QuickAddResult) => {
    try {
      await createTask.mutateAsync({
        title: parsed.title,
        status: 'TODO',
        priority: parsed.priority ?? 'MEDIUM',
        isPrivate: false,
        dueDate: parsed.dueDate,
      });
      toast.success('Task created');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const handleNewTask = () => handleQuickCreate({ title: 'Untitled task' });

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
      toast.success('Task deleted');
    } catch (err) {
      toast.error((err as Error).message);
    }
  };

  const tasks: TaskDTO[] = tasksQuery.data ?? [];
  const openTask = openId ? tasks.find((t) => t.id === openId) ?? null : null;

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <ViewToggle value={view} onChange={setView} />
      </div>

      <TaskToolbar
        filters={filters}
        onFiltersChange={setFilters}
        onNewTask={handleNewTask}
        showFilters={view !== 'kanban'}
      />

      {view === 'kanban' ? (
        <KanbanBoard />
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
          onOpen={openPanel}
          onToggleComplete={handleToggleComplete}
        />
      )}

      <TaskSidePanel
        key={openTask?.id ?? 'closed'}
        open={Boolean(openTask)}
        task={openTask}
        members={membersQuery.data.map((member) => ({
          id: member.id,
          name: member.name,
          email: member.email ?? '',
        }))}
        labels={[]}
        onClose={closePanel}
        onSave={handleSave}
        onDelete={handleDelete}
      />
    </div>
  );
}
