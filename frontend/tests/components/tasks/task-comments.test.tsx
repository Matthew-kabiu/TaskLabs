import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskComments } from '@/components/tasks/task-comments';

const mocks = vi.hoisted(() => ({
  addComment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('convex/react', () => ({
  useQuery: () => ({ id: 'u1' }),
}));

vi.mock('@/hooks/useTaskComments', () => ({
  useTaskComments: () => ({ data: [], isLoading: false }),
  useAddTaskComment: () => ({ mutateAsync: mocks.addComment, isPending: false }),
  useUpdateTaskComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useRemoveTaskComment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

describe('TaskComments', () => {
  it('reveals the new-comment composer only when requested', async () => {
    render(<TaskComments taskId="t1" workspaceId="ws1" members={[]} />);

    expect(screen.queryByLabelText('Write a task comment')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Comment' }));
    fireEvent.change(screen.getByLabelText('Write a task comment'), {
      target: { value: 'Ship the view-first task modal.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Comment' }));

    await waitFor(() =>
      expect(mocks.addComment).toHaveBeenCalledWith({
        taskId: 't1',
        input: { body: 'Ship the view-first task modal.' },
      }),
    );
    expect(screen.queryByLabelText('Write a task comment')).not.toBeInTheDocument();
  });
});
