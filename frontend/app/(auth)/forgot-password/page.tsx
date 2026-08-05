import type { Metadata } from 'next';
import Link from 'next/link';
import { fetchQuery } from 'convex/nextjs';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { TaskLabsLogo } from '@/components/tasklabs-logo';
import { Button } from '@/components/ui/button';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { maskEmail } from '@/lib/site';
import { convexServerOptions } from '@/lib/convex-server';

export const metadata: Metadata = {
  title: 'Password help — TaskLabs',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function ForgotPasswordPage() {
  const admin = (await fetchQuery(
    BACKEND_ROUTES.profile.adminContact,
    {},
    convexServerOptions(),
  )) as { email: string } | null;
  if (!admin?.email) throw new Error('No platform administrator contact is configured');
  const supportEmail = admin.email;
  const maskedEmail = maskEmail(supportEmail);

  return (
    <main className="grid min-h-svh place-items-center bg-background px-4 py-10">
      <section className="w-full max-w-md rounded-xl border border-border/60 bg-card/30 p-6 shadow-sm">
        <TaskLabsLogo className="mb-8" />
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Account recovery</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Reset your password</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Password resets are managed by this TaskLabs instance administrator.
          Contact your administrator at{' '}
          <a className="font-medium text-foreground underline underline-offset-4" href={`mailto:${supportEmail}`}>
            {maskedEmail}
          </a>.
        </p>
        <Button asChild className="mt-6 w-full gap-2">
          <a href={`mailto:${supportEmail}`}><Mail className="h-4 w-4" /> Contact administrator</a>
        </Button>
        <Link href={ROUTES.app.login} className="mt-4 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to sign in
        </Link>
      </section>
    </main>
  );
}
