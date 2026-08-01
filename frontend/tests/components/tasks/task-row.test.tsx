import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskRow } from '@/components/tasks/task-row';

const baseTask = {
  id: 't1',
  number: 1,
  workspaceId: 'ws1',
  creatorId: 'u1',
  title: 'Buy milk',
  description: null,
  status: 'TODO' as const,
  priority: 'HIGH' as const,
  dueDate: '2026-04-30T00:00:00Z',
  completedAt: null,
  isPrivate: false,
  position: 1,
  assignees: [
    { user: { id: 'u1', name: 'Alice', email: 'a@a.com' } },
    { user: { id: 'u2', name: 'Bob', email: 'b@b.com' } },
  ],
  labels: [{ label: { id: 'l1', name: 'Bug', color: '#ef4444' } }],
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-28T00:00:00Z',
};

describe('TaskRow', () => {
  it('renders title, due-date chip, label pill, assignee initials', () => {
    render(<TaskRow task={baseTask} selected={false} onOpen={() => {}} onSelect={() => {}} onDelete={async () => {}} onToggleComplete={() => {}} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText(/Apr 30/i)).toBeInTheDocument();
    // assignee initials
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('calls onToggleComplete with new status', () => {
    const fn = vi.fn();
    render(<TaskRow task={baseTask} selected={false} onOpen={() => {}} onSelect={() => {}} onDelete={async () => {}} onToggleComplete={fn} />);
    fireEvent.click(screen.getByRole('checkbox', { name: /toggle buy milk/i }));
    expect(fn).toHaveBeenCalledWith('t1', 'DONE');
  });

  it('calls onOpen when row body clicked', () => {
    const fn = vi.fn();
    render(<TaskRow task={baseTask} selected={false} onOpen={fn} onSelect={() => {}} onDelete={async () => {}} onToggleComplete={() => {}} />);
    fireEvent.click(screen.getByText('Buy milk'));
    expect(fn).toHaveBeenCalledWith('t1');
  });

  it('uses the custom confirmation dialog before deleting', async () => {
    const onDelete = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskRow
        task={baseTask}
        selected={false}
        onOpen={() => {}}
        onSelect={() => {}}
        onDelete={onDelete}
        onToggleComplete={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /delete buy milk/i }));
    expect(screen.getByRole('heading', { name: /delete task/i })).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /^delete task$/i }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('t1'));
  });
});
