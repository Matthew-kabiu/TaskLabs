import { fireEvent, render, screen } from '@testing-library/react';
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
    render(<TaskRow task={baseTask} onOpen={() => {}} onToggleComplete={() => {}} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByText(/Apr 30/i)).toBeInTheDocument();
    // assignee initials
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
  });

  it('calls onToggleComplete with new status', () => {
    const fn = vi.fn();
    render(<TaskRow task={baseTask} onOpen={() => {}} onToggleComplete={fn} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(fn).toHaveBeenCalledWith('t1', 'DONE');
  });

  it('calls onOpen when row body clicked', () => {
    const fn = vi.fn();
    render(<TaskRow task={baseTask} onOpen={fn} onToggleComplete={() => {}} />);
    fireEvent.click(screen.getByText('Buy milk'));
    expect(fn).toHaveBeenCalledWith('t1');
  });
});
