import { redirect } from 'next/navigation';
import { convexAuthNextjsToken } from '@convex-dev/auth/nextjs/server';
import { fetchQuery } from 'convex/nextjs';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { convexServerOptions } from '@/lib/convex-server';
import { AdminSettingsForm } from './admin-settings-form';

export default async function AdminSettingsPage() {
  const token = await convexAuthNextjsToken();
  if (!token) redirect(ROUTES.app.login);
  const profile = (await fetchQuery(
    BACKEND_ROUTES.profile.get,
    {},
    convexServerOptions(token),
  )) as { platformRole: 'ADMIN' | 'MEMBER' };
  if (profile.platformRole !== 'ADMIN') redirect(ROUTES.app.home);
  const setting = (await fetchQuery(
    BACKEND_ROUTES.settings.getSystem,
    {},
    convexServerOptions(),
  )) as {
    allowPublicRegistration: boolean;
  };

  return (
    <div className="mx-auto max-w-2xl p-6 md:p-10 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Platform settings</h1>
        <p className="text-sm text-muted-foreground">
          Controls that affect every user on this instance.
        </p>
      </header>
      <AdminSettingsForm
        initialAllowPublicRegistration={setting.allowPublicRegistration}
      />
    </div>
  );
}
