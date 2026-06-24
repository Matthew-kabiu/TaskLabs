'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConvexAuth, useQuery } from 'convex/react';
import { getSetupRedirectAfterFirstRun } from '@/lib/first-run-routing';
import { BACKEND_ROUTES } from '@/lib/routes';
import { SetupWizard } from './setup-wizard';

export default function SetupPage() {
  const router = useRouter();
  const { isLoading: authLoading, isAuthenticated } = useConvexAuth();
  const status = useQuery(BACKEND_ROUTES.setup.status, {}) as
    | { setupNeeded: boolean }
    | undefined;

  useEffect(() => {
    if (status === undefined || authLoading) return;
    const target = getSetupRedirectAfterFirstRun(status, isAuthenticated);
    if (target !== null) router.replace(target);
  }, [authLoading, isAuthenticated, router, status]);

  if (status?.setupNeeded === false) {
    return null;
  }
  return <SetupWizard />;
}
