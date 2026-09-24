'use client';

import { useCallback, useMemo } from 'react';
import {
  useMutation as useConvexMutation,
  useQuery,
} from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import type {
  CreateProjectInput,
  CreateProjectUpdateInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from '@/lib/validations/project.schema';
import { usePendingMutation } from '@/hooks/usePendingMutation';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { triggerIceIndex } from '@/hooks/useIce';
import { BACKEND_ROUTES } from '@/lib/routes';

export type ProjectStatus =
  | 'PLANNING'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ARCHIVED';

export type ProjectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ProjectResourceType =
  | 'WEBSITE'
  | 'FORM'
  | 'DATABASE'
  | 'GITHUB'
  | 'COMMUNICATION'
  | 'CUSTOM';

export interface ProjectResourceDTO {
  label: string;
  type: ProjectResourceType;
  url: string;
}

export interface ProjectDTO {
  id: string;
  workspaceId: string;
  creatorId: string;
  leadId: string;
  isFavorite: boolean;
  title: string;
  description: string | null;
  status: ProjectStatus;
  priority: ProjectPriority;
  memberIds: string[];
  startDate: string | null;
  endDate: string | null;
  resources: ProjectResourceDTO[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdateDTO {
  id: string;
  projectId: string;
  authorId: string;
  body: string;
  editedAt: string | null;
  createdAt: string;
}

type ProjectQueryResult = {
  data: ProjectDTO[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

function listArgs(workspaceId: string, filters: Partial<ListProjectsQuery>) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    status: filters.status,
    priority: filters.priority,
    q: filters.q,
  };
}

function dateArg(value: Date | string | number | null | undefined) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function optionalDateArg(value: Date | string | number | null | undefined) {
  const next = dateArg(value);
  return next === null ? undefined : next;
}

function createArgs(workspaceId: string, input: CreateProjectInput) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    memberIds: input.memberIds?.map((id) => id as Id<'users'>),
    leadId: input.leadId ? (input.leadId as Id<'users'>) : undefined,
    startDate: optionalDateArg(input.startDate),
    endDate: optionalDateArg(input.endDate),
    resources: input.resources,
  };
}

function updateArgs(
  workspaceId: string,
  projectId: string,
  input: UpdateProjectInput,
) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    projectId: projectId as Id<'projects'>,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    memberIds: input.memberIds?.map((id) => id as Id<'users'>),
    leadId: input.leadId ? (input.leadId as Id<'users'>) : undefined,
    startDate: dateArg(input.startDate),
    endDate: dateArg(input.endDate),
    resources: input.resources,
  };
}

export function useProjects(
  filters: Partial<ListProjectsQuery> = {},
  workspaceIdArg?: string | null,
): ProjectQueryResult {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const queryArgs = useMemo(
    () => (workspaceId ? listArgs(workspaceId, filters) : 'skip'),
    [filters, workspaceId],
  );
  const data = useQuery(
    BACKEND_ROUTES.projects.list,
    queryArgs,
  ) as ProjectDTO[] | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useProject(
  projectId?: string | null,
  workspaceIdArg?: string | null,
) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const data = useQuery(
    BACKEND_ROUTES.projects.get,
    workspaceId && projectId
      ? {
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: projectId as Id<'projects'>,
        }
      : 'skip',
  ) as ProjectDTO | null | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId && projectId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useProjectUpdates(
  projectId?: string | null,
  workspaceIdArg?: string | null,
) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const data = useQuery(
    BACKEND_ROUTES.projects.updatesList,
    workspaceId && projectId
      ? {
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: projectId as Id<'projects'>,
        }
      : 'skip',
  ) as ProjectUpdateDTO[] | undefined;

  return {
    data,
    isLoading: Boolean(workspaceId && projectId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useCreateProject(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const createProject = useConvexMutation(BACKEND_ROUTES.projects.create);
  return usePendingMutation<ProjectDTO, CreateProjectInput>(
    useCallback(
      async (input) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before creating projects.');
        }
        const created = (await createProject(
          createArgs(workspaceId, input) as Parameters<typeof createProject>[0],
        )) as ProjectDTO;
        triggerIceIndex(workspaceId);
        return created;
      },
      [createProject, workspaceId],
    ),
  );
}

export function useUpdateProject(workspaceIdArg?: string | null) {  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const updateProject = useConvexMutation(BACKEND_ROUTES.projects.update);
  return usePendingMutation<ProjectDTO, { id: string; input: UpdateProjectInput }>(
    useCallback(
      async ({ id, input }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before updating projects.');
        }
        const updated = (await updateProject(
          updateArgs(workspaceId, id, input) as Parameters<
            typeof updateProject
          >[0],
        )) as ProjectDTO;
        triggerIceIndex(workspaceId);
        return updated;
      },
      [updateProject, workspaceId],
    ),
  );
}

export function useDeleteProject(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeProject = useConvexMutation(BACKEND_ROUTES.projects.remove);
  return usePendingMutation<void, string>(
    useCallback(
      async (id) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before deleting projects.');
        }
        await removeProject({
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: id as Id<'projects'>,
        });
        triggerIceIndex(workspaceId);
      },
      [removeProject, workspaceId],
    ),
  );
}

export function useSetProjectFavorite(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const setFavorite = useConvexMutation(BACKEND_ROUTES.projects.setFavorite);
  return usePendingMutation<{ isFavorite: boolean }, { id: string; isFavorite: boolean }>(
    useCallback(
      async ({ id, isFavorite }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before favoriting projects.');
        }
        return (await setFavorite({
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: id as Id<'projects'>,
          isFavorite,
        })) as { isFavorite: boolean };
      },
      [setFavorite, workspaceId],
    ),
  );
}

export function useAddProjectUpdate(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const addUpdate = useConvexMutation(BACKEND_ROUTES.projects.addUpdate);
  return usePendingMutation<
    ProjectUpdateDTO,
    { projectId: string; input: CreateProjectUpdateInput }
  >(
    useCallback(
      async ({ projectId, input }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before posting project updates.');
        }
        const created = (await addUpdate({
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: projectId as Id<'projects'>,
          body: input.body,
        })) as ProjectUpdateDTO;
        triggerIceIndex(workspaceId);
        return created;
      },
      [addUpdate, workspaceId],
    ),
  );
}

export function useRemoveProjectUpdate(workspaceIdArg?: string | null) {
  const { activeWorkspaceId } = useWorkspaces();
  const workspaceId = workspaceIdArg ?? activeWorkspaceId;
  const removeUpdate = useConvexMutation(BACKEND_ROUTES.projects.removeUpdate);
  return usePendingMutation<
    void,
    { projectId: string; updateId: string }
  >(
    useCallback(
      async ({ projectId, updateId }) => {
        if (!workspaceId) {
          throw new Error('Select a workspace before deleting project updates.');
        }
        await removeUpdate({
          workspaceId: workspaceId as Id<'workspaces'>,
          projectId: projectId as Id<'projects'>,
          updateId: updateId as Id<'projectUpdates'>,
        });
        triggerIceIndex(workspaceId);
      },
      [removeUpdate, workspaceId],
    ),
  );
}
