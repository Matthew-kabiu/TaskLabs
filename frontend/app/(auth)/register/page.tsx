import { redirect } from 'next/navigation';
import { fetchQuery } from 'convex/nextjs';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { convexServerOptions } from '@/lib/convex-server';
import { RegisterForm } from './register-form';

export default async function RegisterPage() {
  const setting = (await fetchQuery(
    BACKEND_ROUTES.registration.status,
    {},
    convexServerOptions(),
  )) as {
    allowPublicRegistration: boolean;
  };
  if (!setting.allowPublicRegistration) redirect(ROUTES.app.registerClosed);

  return (
    <main className="grid min-h-svh w-full place-items-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <RegisterForm />
      </div>
    </main>
  );
}
