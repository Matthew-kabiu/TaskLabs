import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TaskList } from '@/components/tasks/task-list';

const t = (id: string, due: string | null, status: 'TODO' | 'DONE' = 'TODO') => ({
  id,
  number: 1,
  workspaceId: 'ws1',
  creatorId: 'u1',
  title: id,
  description: null,
  status,
  priority: 'MEDIUM' as const,
  dueDate: due,
  completedAt: null,
  isPrivate: false,
  position: 0,
  projectId: null,
  assignees: [],
  labels: [],
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-28T00:00:00Z',
});

describe('TaskList', () => {
  it('renders group headings only when non-empty', () => {
    render(
      <TaskList
        tasks={[t('today', '2026-04-28T20:00:00Z'), t('none', null)]}
        now={new Date('2026-04-28T12:00:00Z')}
        selectedIds={new Set()}
        onOpen={() => {}}
        onSelectionChange={() => {}}
        onDelete={async () => {}}
        onDeleteSelected={async () => {}}
        onToggleComplete={() => {}}
      />,
    );
    expect(screen.getByText(/Today/)).toBeInTheDocument();
    expect(screen.getByText(/No Date/)).toBeInTheDocument();
    expect(screen.queryByText(/Overdue/)).toBeNull();
  });

  it('shows empty state when nothing matches', () => {
    render(
      <TaskList
        tasks={[]}
        now={new Date()}
        selectedIds={new Set()}
        onOpen={() => {}}
        onSelectionChange={() => {}}
        onDelete={async () => {}}
        onDeleteSelected={async () => {}}
        onToggleComplete={() => {}}
      />,
    );
    expect(screen.getByText(/No tasks/i)).toBeInTheDocument();
  });
});
