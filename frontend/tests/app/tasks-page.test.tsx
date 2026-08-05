import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import TasksPage from '@/app/(app)/tasks/page';

const testState = vi.hoisted(() => ({
  search: '',
  tasks: [] as Record<string, unknown>[],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(testState.search),
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
  useWorkspaceMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    data: testState.tasks,
    isLoading: false,
    isError: false,
    error: null,
  }),
  useCreateTask: () => ({ mutateAsync: vi.fn() }),
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
  useDeleteTask: () => ({ mutateAsync: vi.fn() }),
  useDeleteTasks: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useLabels', () => ({
  useLabels: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({ data: [], isLoading: false }),
}));

describe('TasksPage', () => {
  beforeEach(() => {
    testState.search = '';
    testState.tasks = [];
  });

  it('renders toolbar, create action, and empty list', async () => {
    render(<TasksPage />);
    await waitFor(() =>
      expect(screen.getByPlaceholderText(/search tasks/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /new task/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/no tasks/i)).toBeInTheDocument(),
    );
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
