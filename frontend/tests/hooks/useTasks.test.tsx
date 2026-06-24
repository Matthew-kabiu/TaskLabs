import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useTasks, useCreateTask } from '@/hooks/useTasks';

const convex = vi.hoisted(() => ({
  useQuery: vi.fn(),
  useMutation: vi.fn(),
}));

vi.mock('convex/react', () => ({
  useQuery: convex.useQuery,
  useMutation: convex.useMutation,
}));

vi.mock('@/hooks/useWorkspaces', () => ({
  useWorkspaces: () => ({ activeWorkspaceId: 'ws1' }),
}));

beforeEach(() => {
  convex.useQuery.mockReset();
  convex.useMutation.mockReset();
});

describe('useTasks', () => {
  it('queries Convex tasks with workspace and filters', async () => {
    convex.useQuery.mockReturnValue([{ id: 't1', title: 'A' }]);
    const { result } = renderHook(() => useTasks({ status: 'TODO' }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(convex.useQuery).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ workspaceId: 'ws1', status: 'TODO' }),
    );
    expect(result.current.data).toEqual([{ id: 't1', title: 'A' }]);
  });
});

describe('useCreateTask', () => {
  it('calls the Convex create mutation with active workspace', async () => {
    const create = vi.fn().mockResolvedValue({ id: 't1', title: 'A' });
    convex.useMutation.mockReturnValue(create);
    const { result } = renderHook(() => useCreateTask());
    await act(async () => {
      await result.current.mutateAsync({
        title: 'A',
        status: 'TODO',
        priority: 'MEDIUM',
        isPrivate: false,
        assigneeIds: [],
        labelIds: [],
      });
    });
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ workspaceId: 'ws1', title: 'A' }),
    );
  });
});
