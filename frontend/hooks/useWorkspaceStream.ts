'use client';

import { useEffect } from 'react';

export function useWorkspaceStream(opts: { currentUserId: string | null }) {
  useEffect(() => {
    void opts.currentUserId;
  }, [opts.currentUserId]);
}
