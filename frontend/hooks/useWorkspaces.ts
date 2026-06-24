'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useConvexAuth } from '@convex-dev/auth/react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { useActiveWorkspaceStore } from '@/lib/stores/active-workspace';
import { BACKEND_ROUTES } from '@/lib/routes';

export type WorkspaceRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export type WorkspaceDTO = {
  id: Id<'workspaces'>;
  name: string;
  slug: string;
  isPersonal: boolean;
  createdAt: number;
  updatedAt: number;
  role: WorkspaceRole;
};

export type WorkspaceMemberDTO = {
  id: Id<'users'>;
  userId: Id<'users'>;
  email: string | null;
  name: string | null;
  role: WorkspaceRole;
  joinedAt: number;
};

export function useWorkspaces() {
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const activeWorkspaceId = useActiveWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useActiveWorkspaceStore((s) => s.setActiveWorkspaceId);
  const ensuredRef = useRef(false);

  const workspaceRows = useQuery(
    BACKEND_ROUTES.workspaces.list,
    isAuthenticated ? {} : 'skip',
  ) as WorkspaceDTO[] | undefined;
  const defaultWorkspace = useQuery(
    BACKEND_ROUTES.workspaces.defaultWorkspace,
    isAuthenticated ? {} : 'skip',
  ) as WorkspaceDTO | null | undefined;
  const ensurePersonal = useMutation(BACKEND_ROUTES.workspaces.ensurePersonal);

  const workspaces = useMemo(() => workspaceRows ?? [], [workspaceRows]);
  const validActiveId = activeWorkspaceId
    ? workspaces.some((workspace) => workspace.id === activeWorkspaceId)
    : false;
  const resolvedActiveWorkspace =
    (validActiveId
      ? workspaces.find((workspace) => workspace.id === activeWorkspaceId)
      : undefined) ??
    defaultWorkspace ??
    workspaces[0] ??
    null;

  useEffect(() => {
    if (!isAuthenticated || workspaceRows === undefined) return;
    if (workspaceRows.length > 0 || ensuredRef.current) return;
    ensuredRef.current = true;
    ensurePersonal({})
      .then((workspace) => {
        if (workspace?.id) setActiveWorkspaceId(workspace.id);
      })
      .catch(() => {
        ensuredRef.current = false;
      });
  }, [ensurePersonal, isAuthenticated, setActiveWorkspaceId, workspaceRows]);

  useEffect(() => {
    if (!resolvedActiveWorkspace) return;
    if (resolvedActiveWorkspace.id === activeWorkspaceId) return;
    setActiveWorkspaceId(resolvedActiveWorkspace.id);
  }, [activeWorkspaceId, resolvedActiveWorkspace, setActiveWorkspaceId]);

  return useMemo(
    () => ({
      workspaces,
      activeWorkspace: resolvedActiveWorkspace,
      activeWorkspaceId: resolvedActiveWorkspace?.id ?? null,
      setActiveWorkspaceId,
      isLoading:
        authLoading ||
        (isAuthenticated && (workspaceRows === undefined || defaultWorkspace === undefined)),
      isAuthenticated,
    }),
    [
      authLoading,
      defaultWorkspace,
      isAuthenticated,
      resolvedActiveWorkspace,
      setActiveWorkspaceId,
      workspaceRows,
      workspaces,
    ],
  );
}

export function useWorkspaceMembers(workspaceId: string | null | undefined) {
  const members = useQuery(
    BACKEND_ROUTES.workspaces.members,
    workspaceId ? { workspaceId: workspaceId as Id<'workspaces'> } : 'skip',
  ) as WorkspaceMemberDTO[] | undefined;

  return {
    data: members ?? [],
    isLoading: Boolean(workspaceId) && members === undefined,
  };
}
