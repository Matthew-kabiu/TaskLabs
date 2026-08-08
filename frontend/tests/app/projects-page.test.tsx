import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from '@/app/(app)/projects/page';

const testState = vi.hoisted(() => ({
  search: '',
  projectFilters: {} as Record<string, unknown>,
  projects: [] as Record<string, unknown>[],
  tasks: [] as Record<string, unknown>[],
  favoriteMutation: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(testState.search),
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
  useWorkspaceMembers: () => ({
    data: [{ id: 'user1', userId: 'user1', name: 'Ada Lovelace', email: 'ada@example.com' }],
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: (filters: Record<string, unknown>) => {
    testState.projectFilters = filters;
    return { data: testState.projects, isLoading: false };
  },
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useSetProjectFavorite: () => ({
    mutateAsync: testState.favoriteMutation,
    isPending: false,
  }),
  useUpdateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ data: testState.tasks, isLoading: false }),
}));

describe('ProjectsPage', () => {
  beforeEach(() => {
    testState.search = '';
    testState.projectFilters = {};
    testState.projects = [];
    testState.tasks = [];
    testState.favoriteMutation.mockReset();
    testState.favoriteMutation.mockResolvedValue({ isFavorite: true });
  });

  it('renders header, new-project action, and empty state', async () => {
    render(<ProjectsPage />);
    expect(screen.getByRole('heading', { level: 1, name: /projects/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /new project/i })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText(/no projects yet/i)).toBeInTheDocument(),
    );
  });

  it('opens the create project dialog', async () => {
    render(<ProjectsPage />);
    fireEvent.click(await screen.findByRole('button', { name: /new project/i }));
    expect(
      await screen.findByRole('heading', { name: /create project/i }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toHaveValue('');
  });

  it('applies a status from a dashboard project deep link', () => {
    testState.search = 'status=IN_PROGRESS';

    render(<ProjectsPage />);

    expect(testState.projectFilters).toMatchObject({ status: 'IN_PROGRESS' });
  });

  it('renders a compact portfolio table with task progress', () => {
    testState.projects = [
      {
        id: 'project1',
        workspaceId: 'ws1',
        creatorId: 'user1',
        leadId: 'user1',
        isFavorite: false,
        title: 'Website redesign',
        description: 'Refresh the public experience.',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        memberIds: ['user1'],
        startDate: null,
        endDate: '2026-09-15T00:00:00.000Z',
        resources: [],
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
      },
    ];
    testState.tasks = [
      { id: 'task1', projectId: 'project1', status: 'TODO' },
      { id: 'task2', projectId: 'project1', status: 'DONE' },
    ];

    render(<ProjectsPage />);

    expect(screen.getByRole('table', { name: /projects portfolio/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Health' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Issues' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /website redesign/i })).toBeInTheDocument();
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByLabelText('50% complete')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /favorite website redesign/i }));
    expect(testState.favoriteMutation).toHaveBeenCalledWith({
      id: 'project1',
      isFavorite: true,
    });
  });
});
