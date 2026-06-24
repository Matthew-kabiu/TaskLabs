import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskSidePanel } from '@/components/tasks/task-side-panel';

const task = {
  id: 't1',
  number: 1,
  workspaceId: 'ws1',
  creatorId: 'u1',
  title: 'Initial',
  description: 'desc',
  status: 'TODO' as const,
  priority: 'MEDIUM' as const,
  dueDate: null,
  completedAt: null,
  isPrivate: false,
  position: 1,
  assignees: [],
  labels: [],
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-28T00:00:00Z',
};

describe('TaskSidePanel', () => {
  it('renders task title and submits patch on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskSidePanel
        open
        task={task}
        members={[]}
        labels={[]}
        onClose={() => {}}
        onSave={onSave}
        onDelete={async () => {}}
      />,
    );
    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'Updated' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith('t1', expect.objectContaining({ title: 'Updated' })),
    );
  });
});
