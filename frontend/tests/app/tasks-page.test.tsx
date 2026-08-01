import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TasksPage from '@/app/(app)/tasks/page';

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
  useWorkspaceMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    data: [],
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

describe('TasksPage', () => {
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
});
