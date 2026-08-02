import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { DndContext } from '@dnd-kit/core';
import { KanbanCard, type KanbanTask } from '@/components/tasks/kanban-card';

const openPanel = vi.fn();

vi.mock('@/lib/stores/task-panel', () => ({
  useTaskPanel: (selector: (s: { open: (id: string) => void }) => unknown) =>
    selector({ open: openPanel }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useDeleteTask: () => ({ mutateAsync: vi.fn().mockResolvedValue(undefined) }),
}));

const task: KanbanTask = {
  id: 't1',
  number: 7,
  workspaceId: 'w1',
  creatorId: 'u1',
  title: 'Ship the thing',
  description: null,
  status: 'TODO',
  priority: 'MEDIUM',
  dueDate: null,
  completedAt: null,
  isPrivate: false,
  position: 1024,
  assignees: [
    { id: 'u1', userId: 'u1', name: 'Alice', email: 'alice@example.com' },
  ],
  labels: [{ id: 'l1', name: 'Bug', color: '#ef4444' }],
};

function renderCard() {
  return render(
    <DndContext>
      <KanbanCard task={task} />
    </DndContext>,
  );
}

describe('KanbanCard accessibility', () => {
  beforeEach(() => {
    openPanel.mockClear();
  });

  it('exposes the drag/open surface as a keyboard-reachable button', () => {
    renderCard();
    const surface = screen.getByRole('button', { name: 'Task: Ship the thing' });

    expect(surface).toHaveAttribute('tabindex', '0');
    expect(surface).toHaveAttribute('aria-roledescription');
  });

  it('opens the task via keyboard on Enter and Space', () => {
    renderCard();
    const surface = screen.getByRole('button', { name: 'Task: Ship the thing' });

    fireEvent.keyDown(surface, { key: 'Enter' });
    expect(openPanel).toHaveBeenCalledWith('t1');

    openPanel.mockClear();
    fireEvent.keyDown(surface, { key: ' ' });
    expect(openPanel).toHaveBeenCalledWith('t1');
  });

  it('does not nest the action buttons inside the drag surface', () => {
    renderCard();
    const surface = screen.getByRole('button', { name: 'Task: Ship the thing' });
    const edit = screen.getByRole('button', { name: 'Edit task' });
    const remove = screen.getByRole('button', { name: 'Delete task' });

    // Nested interactive controls are invalid ARIA and unreachable by keyboard.
    expect(surface.contains(edit)).toBe(false);
    expect(surface.contains(remove)).toBe(false);
    expect(within(surface).queryByRole('button')).toBeNull();
  });

  it('renders the flattened task relations returned by Convex', () => {
    renderCard();

    expect(screen.getByText('Bug')).toBeInTheDocument();
    expect(screen.getByTitle('Alice')).toHaveTextContent('AL');
  });
});
