'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveProjectState = {
  activeProjectIds: Record<string, string>;
  setActiveProjectId: (workspaceId: string, projectId: string) => void;
  clearActiveProjectId: (workspaceId: string) => void;
};

export const useActiveProjectStore = create<ActiveProjectState>()(
  persist(
    (set) => ({
      activeProjectIds: {},
      setActiveProjectId: (workspaceId, projectId) =>
        set((state) => ({
          activeProjectIds: {
            ...state.activeProjectIds,
            [workspaceId]: projectId,
          },
        })),
      clearActiveProjectId: (workspaceId) =>
        set((state) => {
          const activeProjectIds = { ...state.activeProjectIds };
          delete activeProjectIds[workspaceId];
          return { activeProjectIds };
        }),
    }),
    { name: 'tasklabs.activeProject' },
  ),
);
