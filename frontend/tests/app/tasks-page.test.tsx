import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TasksPage from '@/app/(app)/tasks/page';

const testState = vi.hoisted(() => ({
  search: '',
  tasks: [] as Record<string, unknown>[],
  filters: null as Record<string, unknown> | null,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(testState.search),
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
  useWorkspaceMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: (filters: Record<string, unknown>) => {
    testState.filters = filters;
    return {
      data: testState.tasks,
      isLoading: false,
      isError: false,
      error: null,
    };
  },
  useTask: () => ({ data: null, isLoading: false, isError: false, error: null }),
  useCreateTask: () => ({ mutateAsync: vi.fn() }),
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
  useDeleteTasks: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReorderTasks: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/hooks/useLabels', () => ({
  useLabels: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [{ id: 'p1', title: 'Website redesign' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useActiveProject', () => ({
  useActiveProject: () => ({
    activeProject: { id: 'p1', title: 'Website redesign' },
    activeProjectId: 'p1',
    setActiveProjectId: vi.fn(),
    isLoading: false,
  }),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    testState.search = '';
    testState.tasks = [];
    testState.filters = null;
  });

  it('renders toolbar, create action, and the default Kanban view', async () => {
    render(<TasksPage />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
    expect(screen.getByText('Website redesign')).toBeInTheDocument();
    expect(testState.filters).toMatchObject({ projectId: 'p1' });
    expect(screen.getByTestId('tasks-page')).toHaveClass(
      'h-[calc(100dvh-7.5rem)]',
      'min-h-0',
      'overflow-hidden',
      'md:h-dvh',
    );
    expect(screen.getByText('Backlog')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('opens the create task panel without creating an untitled task', async () => {
    render(<TasksPage />);
    fireEvent.click(await screen.findByRole('button', { name: /new task/i }));
    expect(await screen.findByRole('heading', { name: /create task/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
  });

  it('opens dashboard task links on the referenced subset', async () => {
    testState.search = 'view=overdue';
    testState.tasks = [
      {
        id: 'overdue',
        number: 1,
        workspaceId: 'ws1',
        creatorId: 'u1',
        title: 'Overdue task',
        description: null,
        status: 'TODO',
        priority: 'HIGH',
        dueDate: new Date(Date.now() - 86_400_000).toISOString(),
        completedAt: null,
        isPrivate: false,
        position: 0,
        projectId: null,
        assignees: [],
        labels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'future',
        number: 2,
        workspaceId: 'ws1',
        creatorId: 'u1',
        title: 'Future task',
        description: null,
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: new Date(Date.now() + 86_400_000).toISOString(),
        completedAt: null,
        isPrivate: false,
        position: 1,
        projectId: null,
        assignees: [],
        labels: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    render(<TasksPage />);

    expect(await screen.findByText('Overdue task')).toBeInTheDocument();
    expect(screen.queryByText('Future task')).not.toBeInTheDocument();
    expect(screen.getByText(/Showing dashboard view:/i)).toHaveTextContent('Overdue');
    expect(screen.getByRole('link', { name: /clear view/i })).toHaveAttribute(
      'href',
      '/tasks',
    );
  });
});
