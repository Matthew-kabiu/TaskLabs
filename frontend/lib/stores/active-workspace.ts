'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ActiveWorkspaceState = {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (workspaceId: string | null) => void;
};

export const useActiveWorkspaceStore = create<ActiveWorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (workspaceId) => set({ activeWorkspaceId: workspaceId }),
    }),
    { name: 'tasklabs.activeWorkspace' },
  ),
);
