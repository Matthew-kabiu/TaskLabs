'use client';

import { useCallback, useEffect } from 'react';
import { useActiveProjectStore } from '@/lib/stores/active-project';

export type ProjectOption = {
  id: string;
  title: string;
};

export function useActiveProject(
  projects: ProjectOption[] | undefined,
  workspaceId: string | null,
) {
  const storedProjectId = useActiveProjectStore((state) =>
    workspaceId ? state.activeProjectIds[workspaceId] ?? null : null,
  );
  const setStoredProjectId = useActiveProjectStore(
    (state) => state.setActiveProjectId,
  );
  const clearStoredProjectId = useActiveProjectStore(
    (state) => state.clearActiveProjectId,
  );
  const activeProject =
    projects?.find((project) => project.id === storedProjectId) ??
    projects?.[0] ??
    null;

  useEffect(() => {
    if (!workspaceId || projects === undefined) return;
    if (activeProject) {
      if (activeProject.id !== storedProjectId) {
        setStoredProjectId(workspaceId, activeProject.id);
      }
      return;
    }
    if (storedProjectId) clearStoredProjectId(workspaceId);
  }, [
    activeProject,
    clearStoredProjectId,
    projects,
    setStoredProjectId,
    storedProjectId,
    workspaceId,
  ]);

  const setActiveProjectId = useCallback(
    (projectId: string) => {
      if (!workspaceId) return;
      setStoredProjectId(workspaceId, projectId);
    },
    [setStoredProjectId, workspaceId],
  );

  return {
    activeProject,
    activeProjectId: activeProject?.id ?? null,
    setActiveProjectId,
    isLoading: projects === undefined,
  };
}
