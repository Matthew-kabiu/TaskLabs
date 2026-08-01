import { fetchQuery } from 'convex/nextjs';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { convexServerOptions } from '@/lib/convex-server';
import { BackToHome } from '@/components/back-to-home';
import { AcceptForm } from './accept-form';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ token: string }> };

export default async function InvitePage({ params }: Props) {
  const { token } = await params;
  let invite;
  try {
    invite = await fetchQuery(
      BACKEND_ROUTES.invitations.validate,
      { token },
      convexServerOptions(),
    );
  } catch (e) {
    const message = e instanceof Error ? e.message.toLowerCase() : '';
    if (message.includes('expired')) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="mb-8">
            <BackToHome />
          </div>
          <h1 className="text-2xl font-semibold">Invitation expired</h1>
          <p className="mt-2 text-muted-foreground">
            This invite link has expired. Please request a new one.
          </p>
        </main>
      );
    }
    if (message.includes('invalid') || message.includes('accepted')) {
      return (
        <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
          <div className="mb-8">
            <BackToHome />
          </div>
          <h1 className="text-2xl font-semibold">Invalid invitation</h1>
          <p className="mt-2 text-muted-foreground">
            We couldn&apos;t find this invitation.
          </p>
        </main>
      );
    }
    throw e;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <div className="mb-8 flex justify-end">
        <BackToHome />
      </div>
      <h1 className="text-2xl font-semibold">Join {invite.workspaceName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set a password for <span className="font-medium">{invite.email}</span>.
      </p>
      <AcceptForm
        token={token}
        email={invite.email}
        redirectTo={ROUTES.app.home}
      />
    </main>
  );
}
