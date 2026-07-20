import { Suspense } from 'react';
import { CalendarDays, KanbanSquare, ListChecks } from 'lucide-react';
import { fetchQuery } from 'convex/nextjs';
import { redirect } from 'next/navigation';
import { getLoginRedirectForFirstRun } from '@/lib/first-run-routing';
import { convexServerOptions } from '@/lib/convex-server';
import { BACKEND_ROUTES } from '@/lib/routes';
import LoginForm from './login-form';

const FEATURES = [
  {
    icon: ListChecks,
    title: 'Tasks',
    body: 'Quick-add, smart parsing, side-panel edits.',
  },
  {
    icon: KanbanSquare,
    title: 'Kanban',
    body: 'Drag between columns, fractional ordering.',
  },
  {
    icon: CalendarDays,
    title: 'Calendar',
    body: 'Month, week, day views with recurring events.',
  },
];

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const setupStatus = (await fetchQuery(
    BACKEND_ROUTES.setup.status,
    {},
    convexServerOptions(),
  )) as {
    setupNeeded: boolean;
  };
  const target = getLoginRedirectForFirstRun(setupStatus);
  if (target) redirect(target);

  return (
    <main className="relative min-h-svh bg-background text-foreground">
      {/* Top rail */}
      <div className="pointer-events-none fixed inset-x-0 top-0 z-20 hidden border-b border-border/60 bg-background/80 px-8 py-3 backdrop-blur md:block">
        <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500/90 shadow-[0_0_10px_rgba(16,185,129,0.6)]" />
            <span className="text-foreground/80">Tasklabs</span>
            <span className="text-border">/</span>
            <span>Sign in</span>
          </div>
          <div className="flex items-center gap-6">
            <span>v0.1.0 · dev</span>
            <span className="hidden lg:inline">localhost:3000</span>
          </div>
        </div>
      </div>

      <div className="grid min-h-svh grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:pt-[44px]">
        {/* ── LEFT — specimen sheet ─────────────────────────────────── */}
        <aside className="relative hidden overflow-hidden border-r border-border/60 bg-muted/30 md:flex md:flex-col">
          {/* dot grid */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:22px_22px]"
          />
          {/* corner crosshair */}
          <svg
            aria-hidden
            className="pointer-events-none absolute right-6 top-6 h-6 w-6 text-foreground/30"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          >
            <path d="M12 0v24M0 12h24" />
            <circle cx="12" cy="12" r="3.5" />
          </svg>
          {/* soft glows */}
          <div
            aria-hidden
            className="pointer-events-none absolute -left-32 top-32 h-96 w-96 rounded-full bg-foreground/[0.06] blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-32 -right-24 h-[28rem] w-[28rem] rounded-full bg-foreground/[0.04] blur-3xl"
          />

          <div className="relative flex h-full flex-col justify-between p-12 lg:p-14">
            <header className="space-y-6">
              <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                <span aria-hidden className="h-px w-8 bg-border" />
                Document · 002 / Session
              </div>
              <div>
                <h1 className="font-light leading-[0.95] tracking-tight text-foreground text-[clamp(2.75rem,4.4vw,4rem)]">
                  Welcome
                  <br />
                  <span className="italic font-normal">back.</span>
                </h1>
                <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-muted-foreground">
                  Sign in to pick up where you left off — your tasks, calendar,
                  and kanban are right where you left them.
                </p>
              </div>
            </header>

            <ul className="relative space-y-px border-y border-border/60">
              {FEATURES.map(({ icon: Icon, title, body }, i) => (
                <li
                  key={title}
                  className="group flex items-center gap-5 border-b border-border/40 py-5 last:border-b-0"
                >
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <Icon
                    className="h-4 w-4 shrink-0 text-foreground/70"
                    aria-hidden
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium leading-tight">{title}</p>
                    <p className="mt-0.5 text-[13px] text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>

            <footer className="flex items-end justify-between gap-6 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <p className="max-w-[18rem] leading-relaxed">
                Authenticated sessions are signed locally and never leave this
                instance.
              </p>
              <span className="shrink-0 text-right">
                Self
                <br />
                hosted.
              </span>
            </footer>
          </div>
        </aside>

        {/* ── RIGHT — form column ───────────────────────────────────── */}
        <section className="relative flex items-start justify-center px-6 pb-16 pt-10 md:items-center md:px-14 md:py-0">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-14 hidden w-px bg-gradient-to-b from-transparent via-border to-transparent md:block"
          />
          <div className="relative w-full max-w-[440px]">
            <Suspense>
              <LoginForm />
            </Suspense>
          </div>
        </section>
      </div>

      {/* Bottom rail */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 hidden items-center justify-between border-t border-border/60 bg-background/80 px-8 py-2.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground backdrop-blur md:flex">
        <span>Encrypted · session pending</span>
        <span className="flex items-center gap-3">
          <span aria-hidden className="h-px w-12 bg-border" />
          Made for self-hosting
        </span>
      </div>
    </main>
  );
}
