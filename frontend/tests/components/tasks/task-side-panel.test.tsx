import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskSidePanel } from '@/components/tasks/task-side-panel';

// The comments section talks to Convex (auth + live queries); this suite covers the
// panel's own form behavior, so stub it out and let task-comments own its coverage.
vi.mock('@/components/tasks/task-comments', () => ({
  TaskComments: ({ taskId }: { taskId: string }) => (
    <div data-testid="task-comments">{taskId}</div>
  ),
}));

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
  projectId: null,
  assignees: [],
  labels: [],
  createdAt: '2026-04-28T00:00:00Z',
  updatedAt: '2026-04-28T00:00:00Z',
};

describe('TaskSidePanel', () => {
  it('shows an existing description as content before opening its editor', () => {
    render(
      <TaskSidePanel
        open
        task={task}
        members={[]}
        labels={[]}
        projects={[]}
        onClose={() => {}}
        onSave={async () => {}}
        onDelete={async () => {}}
      />,
    );

    expect(screen.getByText('desc')).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Description' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Edit description' }));

    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('desc');
  });

  it('renders task title and submits patch on save', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskSidePanel
        open
        task={task}
        members={[]}
        labels={[]}
        projects={[]}
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

  it('submits task details in create mode', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskSidePanel
        open
        task={null}
        members={[]}
        labels={[]}
        projects={[]}
        onClose={() => {}}
        onCreate={onCreate}
        onSave={async () => {}}
        onDelete={async () => {}}
      />,
    );
    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Write release notes' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Write release notes', status: 'TODO' }),
      ),
    );
  });

  it('assigns a workspace member from the properties panel', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskSidePanel
        open
        task={task}
        members={[{ id: 'u1', name: 'Matthew Kabiu', email: 'matt@example.com' }]}
        labels={[]}
        projects={[]}
        onClose={() => {}}
        onSave={onSave}
        onDelete={async () => {}}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Edit assignees' }));
    fireEvent.click(screen.getByText('Matthew Kabiu'));
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith(
        't1',
        expect.objectContaining({ assigneeIds: ['u1'] }),
      ),
    );
  });

  it('defaults new tasks to the active project', async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    render(
      <TaskSidePanel
        open
        task={null}
        members={[]}
        labels={[]}
        projects={[{ id: 'p1', title: 'Website redesign' }]}
        defaultProjectId="p1"
        onClose={() => {}}
        onCreate={onCreate}
        onSave={async () => {}}
        onDelete={async () => {}}
      />,
    );

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Scoped task' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create task/i }));

    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 'p1' }),
      ),
    );
  });

  it('keeps in-progress edits when the same task is updated live', () => {
    const props = {
      open: true as const,
      members: [],
      labels: [],
      projects: [],
      onClose: () => {},
      onSave: async () => {},
      onDelete: async () => {},
    };
    const { rerender } = render(<TaskSidePanel {...props} task={task} />);

    const titleInput = screen.getByLabelText(/title/i);
    fireEvent.change(titleInput, { target: { value: 'My unsaved draft' } });

    // A Convex live update lands for the SAME task (e.g. a teammate edited it).
    // The user's draft must survive: re-syncing on every object change used to
    // silently overwrite whatever they had typed.
    rerender(
      <TaskSidePanel
        {...props}
        task={{ ...task, title: 'Changed by teammate', updatedAt: '2026-05-01T00:00:00Z' }}
      />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('My unsaved draft');
  });

  it('resets the form when a different task is selected', () => {
    const props = {
      open: true as const,
      members: [],
      labels: [],
      projects: [],
      onClose: () => {},
      onSave: async () => {},
      onDelete: async () => {},
    };
    const { rerender } = render(<TaskSidePanel {...props} task={task} />);

    fireEvent.change(screen.getByLabelText(/title/i), {
      target: { value: 'Draft for t1' },
    });

    rerender(
      <TaskSidePanel {...props} task={{ ...task, id: 't2', title: 'Second task' }} />,
    );

    expect(screen.getByLabelText(/title/i)).toHaveValue('Second task');
  });
});
