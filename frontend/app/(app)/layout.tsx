import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/app-shell';
import { convexServerOptions } from '@/lib/convex-server';
import { getDashboardRedirectForFirstRun } from '@/lib/first-run-routing';
import { BACKEND_ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: { children: React.ReactNode }) {
  const [token, setupStatus] = await Promise.all([
    convexAuthNextjsToken(),
    fetchQuery(BACKEND_ROUTES.setup.status, {}, convexServerOptions()),
  ]);
  const target = getDashboardRedirectForFirstRun(
    setupStatus as { setupNeeded: boolean },
    token,
  );
  if (target) redirect(target);

  return <AppShell>{children}</AppShell>;
}
