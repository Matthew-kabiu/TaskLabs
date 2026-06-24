import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { DragEndEvent } from '@dnd-kit/core';
import { KanbanBoard, __test__ } from '@/components/tasks/kanban-board';
import type { KanbanTask } from '@/components/tasks/kanban-card';

const mkTask = (over: Partial<KanbanTask>): KanbanTask =>
  ({
    id: 'tid',
    workspaceId: 'w',
    creatorId: 'u',
    title: 'T',
    description: null,
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: null,
    completedAt: null,
    isPrivate: false,
    position: 1024,
    createdAt: new Date(),
    updatedAt: new Date(),
    assignees: [],
    labels: [],
    ...over,
  }) as KanbanTask;

const updateMutate = vi.fn();
const reorderMutate = vi.fn();

vi.mock('@/lib/hooks/use-tasks', () => ({
  useTasks: () => ({
    data: [
      mkTask({ id: 't1', status: 'TODO', position: 1024, title: 'A' }),
      mkTask({ id: 't2', status: 'TODO', position: 2048, title: 'B' }),
      mkTask({ id: 't3', status: 'IN_PROGRESS', position: 1024, title: 'C' }),
    ],
    isLoading: false,
  }),
  useUpdateTask: () => ({ mutate: updateMutate }),
  useReorderTasks: () => ({ mutate: reorderMutate }),
}));

vi.mock('@/hooks/useTasks', () => ({
  useDeleteTask: () => ({ mutate: vi.fn() }),
}));

vi.mock('@/lib/stores/task-panel', () => ({
  useTaskPanel: (sel: (s: { open: (id: string) => void }) => unknown) =>
    sel({ open: vi.fn() }),
}));

beforeEach(() => {
  updateMutate.mockReset();
  reorderMutate.mockReset();
});

describe('KanbanBoard', () => {
  it('renders the status columns with their counts', () => {
    render(<KanbanBoard />);
    expect(screen.getByLabelText('Backlog column')).toBeInTheDocument();
    expect(screen.getByLabelText('Todo column')).toBeInTheDocument();
    expect(screen.getByLabelText('In Progress column')).toBeInTheDocument();
    expect(screen.getByLabelText('In Review column')).toBeInTheDocument();
    expect(screen.getByLabelText('Done column')).toBeInTheDocument();
    expect(screen.getByLabelText('Archived column')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancelled column')).toBeInTheDocument();
  });

  it('cross-column drag calls useUpdateTask with new status + position', async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByLabelText('Kanban board')).toBeInTheDocument());

    const ev: DragEndEvent = {
      active: { id: 't1', data: { current: { type: 'task' } } },
      over: { id: 'IN_PROGRESS', data: { current: { type: 'column' } } },
      delta: { x: 0, y: 0 },
      collisions: [],
      activatorEvent: new MouseEvent('mousedown'),
    } as unknown as DragEndEvent;

    __test__.handleDragEnd(ev);

    expect(updateMutate).toHaveBeenCalledTimes(1);
    const arg = updateMutate.mock.calls[0][0] as {
      id: string;
      patch: { status: string; position: number };
    };
    expect(arg.id).toBe('t1');
    expect(arg.patch.status).toBe('IN_PROGRESS');
    // Dropped on empty area of IN_PROGRESS where t3 has position 1024,
    // so the new card appends with position = 1024 + 1024 = 2048.
    expect(arg.patch.position).toBe(2048);
  });

  it('within-column reorder calls useReorderTasks', async () => {
    render(<KanbanBoard />);
    await waitFor(() => expect(screen.getByLabelText('Kanban board')).toBeInTheDocument());

    const ev: DragEndEvent = {
      active: { id: 't1', data: { current: { type: 'task' } } },
      over: { id: 't2', data: { current: { type: 'task' } } },
      delta: { x: 0, y: 0 },
      collisions: [],
      activatorEvent: new MouseEvent('mousedown'),
    } as unknown as DragEndEvent;

    __test__.handleDragEnd(ev);

    expect(reorderMutate).toHaveBeenCalledTimes(1);
    const arg = reorderMutate.mock.calls[0][0] as {
      items: { id: string; position: number }[];
    };
    // t1 moved past t2 → new position = 2048 + 1024 = 3072 (tail).
    expect(arg.items).toEqual([{ id: 't1', position: 3072 }]);
  });
});
