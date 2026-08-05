import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { AppShell } from '@/components/app-shell';
import { convexServerOptions } from '@/lib/convex-server';
import { getDashboardRedirectForFirstRun } from '@/lib/first-run-routing';
import { BACKEND_ROUTES } from '@/lib/routes';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

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

  const timeZone = process.env.BACKUP_TIMEZONE;
  if (!timeZone) throw new Error('Missing environment variable BACKUP_TIMEZONE');

  return <AppShell timeZone={timeZone}>{children}</AppShell>;
}
