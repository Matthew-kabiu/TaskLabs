'use client';

import { useEffect } from 'react';
import { useQuery } from 'convex/react';
import { useRouter } from 'next/navigation';
import { PageTransition } from '@/components/page-transition';
import { ResponsiveSidebar } from '@/components/responsive-sidebar';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';

type ProfileUser = {
  name: string | null;
  email: string | null;
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { workspaces, activeWorkspaceId, isLoading, isAuthenticated } = useWorkspaces();
  const setupStatus = useQuery(BACKEND_ROUTES.setup.status, {}) as
    | { setupNeeded: boolean }
    | undefined;
  const profile = useQuery(
    BACKEND_ROUTES.profile.get,
    isAuthenticated ? {} : 'skip',
  ) as ProfileUser | undefined;

  useEffect(() => {
    if (setupStatus?.setupNeeded) {
      router.replace(ROUTES.app.setup);
      return;
    }
    if (!isLoading && !isAuthenticated) {
      router.replace(ROUTES.app.login);
    }
  }, [isAuthenticated, isLoading, router, setupStatus?.setupNeeded]);

  if (isLoading || !activeWorkspaceId || (isAuthenticated && profile === undefined)) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Loading workspace...
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <ResponsiveSidebar
        workspaces={workspaces.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          isPersonal: workspace.isPersonal,
        }))}
        activeWorkspaceId={activeWorkspaceId}
        currentUser={profile}
      />
      <main className="flex flex-1 flex-col overflow-hidden pt-14 pb-16 md:pt-0 md:pb-0">
        <PageTransition>{children}</PageTransition>
      </main>
    </div>
  );
}
