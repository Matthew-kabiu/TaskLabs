'use client';

import { useWorkspaceStream } from '@/hooks/useWorkspaceStream';

export function WorkspaceStreamInit({ currentUserId }: { currentUserId: string }) {
  useWorkspaceStream({ currentUserId });
  return null;
}
