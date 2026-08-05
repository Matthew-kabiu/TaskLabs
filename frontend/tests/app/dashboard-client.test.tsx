import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DashboardClient } from '@/app/(app)/dashboard-client';

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({
    activeWorkspaceId: 'ws1',
    activeWorkspace: { name: 'HQ' },
  }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({ data: [] }),
}));

vi.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    data: [
      { id: 'p1', status: 'PLANNING' },
      { id: 'p2', status: 'IN_PROGRESS' },
      { id: 'p3', status: 'IN_PROGRESS' },
      { id: 'p4', status: 'COMPLETED' },
    ],
  }),
}));

describe('DashboardClient', () => {
  it('links task and project stats to their referenced views', () => {
    render(<DashboardClient timeZone="Africa/Nairobi" />);

    expect(screen.getByRole('link', { name: 'Total: 0. View details' })).toHaveAttribute(
      'href',
      '/tasks',
    );
    expect(screen.getByRole('link', { name: 'Due Today: 0. View details' })).toHaveAttribute(
      'href',
      '/tasks?view=today',
    );
    expect(screen.getByRole('link', { name: 'Overdue: 0. View details' })).toHaveAttribute(
      'href',
      '/tasks?view=overdue',
    );
    expect(
      screen.getByRole('link', { name: 'Done This Week: 0. View details' }),
    ).toHaveAttribute('href', '/tasks?view=done-this-week');

    expect(
      screen.getByRole('link', { name: 'Total Projects: 4. View details' }),
    ).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Planning: 1. View details' })).toHaveAttribute(
      'href',
      '/projects?status=PLANNING',
    );
    expect(
      screen.getByRole('link', { name: 'In Progress: 2. View details' }),
    ).toHaveAttribute('href', '/projects?status=IN_PROGRESS');
    expect(screen.getByRole('link', { name: 'Completed: 1. View details' })).toHaveAttribute(
      'href',
      '/projects?status=COMPLETED',
    );
  });
});
