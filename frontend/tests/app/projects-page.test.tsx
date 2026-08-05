import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import ProjectsPage from '@/app/(app)/projects/page';

const testState = vi.hoisted(() => ({
  search: '',
  projectFilters: {} as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(testState.search),
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
  useWorkspaceMembers: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: (filters: Record<string, unknown>) => {
    testState.projectFilters = filters;
    return { data: [], isLoading: false };
  },
  useCreateProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteProject: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('ProjectsPage', () => {
  beforeEach(() => {
    testState.search = '';
    testState.projectFilters = {};
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
});
