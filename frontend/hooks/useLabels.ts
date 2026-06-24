'use client';

import { useCallback } from 'react';
import {
  useMutation as useConvexMutation,
  useQuery,
} from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import type { CreateLabelInput, UpdateLabelInput } from '@/lib/validations/label.schema';
import { usePendingMutation } from '@/hooks/usePendingMutation';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { BACKEND_ROUTES } from '@/lib/routes';

export interface LabelDTO {
  id: string;
  workspaceId: string;
  name: string;
  color: string;
  createdAt?: string;
  updatedAt?: string;
}

type LabelsQueryResult = {
  data: LabelDTO[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

export function useLabels(workspaceIdArg?: string | null): LabelsQueryResult {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const data = useQuery(
    BACKEND_ROUTES.labels.list,
    workspaceId ? { workspaceId: workspaceId as Id<'workspaces'> } : 'skip',
  ) as LabelDTO[] | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useCreateLabel(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const createLabel = useConvexMutation(BACKEND_ROUTES.labels.create);
  return usePendingMutation<LabelDTO, CreateLabelInput>(
    useCallback(
      async (input) => {
        if (!workspaceId) throw new Error('Select a workspace before creating labels.');
        return (await createLabel({
          workspaceId: workspaceId as Id<'workspaces'>,
          name: input.name,
          color: input.color,
        })) as LabelDTO;
      },
      [createLabel, workspaceId],
    ),
  );
}

export function useUpdateLabel(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const updateLabel = useConvexMutation(BACKEND_ROUTES.labels.update);
  return usePendingMutation<LabelDTO, { id: string; input: UpdateLabelInput }>(
    useCallback(
      async ({ id, input }) => {
        if (!workspaceId) throw new Error('Select a workspace before updating labels.');
        return (await updateLabel({
          workspaceId: workspaceId as Id<'workspaces'>,
          labelId: id as Id<'labels'>,
          name: input.name,
          color: input.color,
        })) as LabelDTO;
      },
      [updateLabel, workspaceId],
    ),
  );
}

export function useDeleteLabel(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeLabel = useConvexMutation(BACKEND_ROUTES.labels.remove);
  return usePendingMutation<void, string>(
    useCallback(
      async (id) => {
        if (!workspaceId) throw new Error('Select a workspace before deleting labels.');
        await removeLabel({
          workspaceId: workspaceId as Id<'workspaces'>,
          labelId: id as Id<'labels'>,
        });
      },
      [removeLabel, workspaceId],
    ),
  );
}
