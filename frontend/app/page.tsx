import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  CalendarDays,
  Check,
  KanbanSquare,
  RadioTower,
  Server,
  Tags,
  Users,
} from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { SITE_DESCRIPTION, SITE_NAME, absoluteUrl } from '@/lib/site';
import { Button } from '@/components/ui/button';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';
import { ProductPreview } from '@/components/marketing/product-preview';
import { CodeBlock } from '@/components/marketing/code-block';
import { JsonLd } from '@/components/marketing/json-ld';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Self-hosted task & calendar manager for teams`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/') },
  openGraph: {
    title: `${SITE_NAME} — Self-hosted task & calendar manager for teams`,
    description: SITE_DESCRIPTION,
    url: absoluteUrl('/'),
    siteName: SITE_NAME,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: `${SITE_NAME} — Self-hosted task & calendar manager for teams`,
    description: SITE_DESCRIPTION,
  },
};

const FEATURES = [
  {
    icon: KanbanSquare,
    title: 'Kanban boards',
    body: 'Drag tasks through ordered stages — backlog, in progress, in review, done.',
  },
  {
    icon: CalendarDays,
    title: 'Shared calendar',
    body: 'Schedule tasks and events with recurrence that understands plain English.',
  },
  {
    icon: RadioTower,
    title: 'Realtime teamwork',
    body: 'Changes land for everyone the moment they happen. No refresh needed.',
  },
  {
    icon: Users,
    title: 'Team workspaces',
    body: 'Invite members, assign roles, and keep every board scoped to its workspace.',
  },
  {
    icon: Tags,
    title: 'Labels, search & notifications',
    body: 'Keep work findable with labels, a command palette, and a notification center.',
  },
  {
    icon: Bot,
    title: 'Telegram reminders',
    body: 'Deadlines reach people where they already are — Telegram, not another tab.',
  },
];

const SELF_HOSTED_POINTS = [
  {
    title: 'Your data stays yours',
    body: 'Runs in containers on your own hardware, not someone else’s multi-tenant cloud.',
  },
  {
    title: 'No per-seat fees',
    body: 'One codebase, unlimited members. You pay your infrastructure, nothing else.',
  },
  {
    title: 'Daily backups',
    body: 'A scheduler dumps Postgres and uploads to S3-compatible storage on your schedule.',
  },
  {
    title: 'Full control',
    body: 'Origins, CORS, auth keys, and upgrades are explicit and yours to manage.',
  },
];

const FAQ = [
  {
    question: 'Do I need a credit card or subscription?',
    answer:
      'No. TaskLabs is self-hosted software. You run it on infrastructure you control and there are no per-seat or per-user fees.',
  },
  {
    question: 'Can my whole team use it?',
    answer:
      'Yes. TaskLabs is multi-tenant: create workspaces, invite members, assign roles, and keep boards, calendars, and notifications scoped per workspace.',
  },
  {
    question: 'Where does it run?',
    answer:
      'Anywhere Docker runs. The stack is Docker Compose with a Postgres database, a Convex backend, and the Next.js frontend. A daily backup service is included.',
  },
  {
    question: 'Can I automate TaskLabs?',
    answer:
      'Yes. Create workspace-scoped API keys in Profile settings and call the stateless MCP endpoint at POST /api/mcp to manage tasks, events, labels, and more from scripts or AI agents.',
  },
];

const SOFTWARE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: absoluteUrl('/'),
  description: SITE_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    description: 'Self-hosted. No per-seat fees.',
  },
  featureList: [
    'Kanban boards',
    'Shared calendar with recurrence',
    'Realtime team updates',
    'Telegram reminders',
    'Team workspaces and invitations',
    'MCP endpoint and API keys',
  ],
};

const WEBSITE_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: absoluteUrl('/'),
  description: SITE_DESCRIPTION,
};

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <JsonLd data={SOFTWARE_JSONLD} />
      <JsonLd data={WEBSITE_JSONLD} />
      <SiteHeader variant="marketing" />

      <main className="flex-1">
        <section className="mx-auto max-w-7xl px-4 pb-20 pt-14 sm:px-6 lg:px-8 lg:pb-28 lg:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Self-hosted task &amp; calendar management
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-light leading-[1.05] tracking-tight text-foreground md:text-5xl lg:text-6xl">
                Run your team’s board on infrastructure{' '}
                <em className="font-normal italic">you</em> control.
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
                Kanban boards, a shared calendar, and Telegram reminders — no
                per-seat fees, no third-party cloud, no lock-in.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-11 px-6">
                  <Link href={ROUTES.app.setup}>
                    Get started
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="h-11 px-6">
                  <Link href={ROUTES.app.docs.index}>Read the docs</Link>
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute -inset-8 rounded-2xl bg-muted/40" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-lg border border-border shadow-sm">
                <ProductPreview />
              </div>
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <h2 className="max-w-2xl text-3xl font-light tracking-tight text-foreground md:text-4xl">
              Built for the way teams actually work.
            </h2>
            <div className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="flex gap-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-md border border-border bg-background text-foreground">
                    <feature.icon className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                      {feature.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          id="self-hosted"
          className="border-t border-border scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">
                Your infrastructure. Your data.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                TaskLabs is a single Docker Compose stack — Postgres, a Convex
                backend, and the frontend. One command brings it up on any
                server.
              </p>
            </div>

            <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:items-start">
              <CodeBlock
                lang="bash"
                code={[
                  'cp .env.example .env.dev',
                  'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
                  '  up -d postgres backend dashboard',
                  '',
                  '# one-time: generate admin + auth keys',
                  'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
                  '  exec backend ./generate_admin_key.sh',
                  'pnpm --dir backend keys',
                  '',
                  '# start the app with live reload',
                  'docker compose --env-file .env.dev -f docker-compose.dev.yml \\',
                  '  up --build frontend convex-dev',
                ].join('\n')}
              />

              <div className="grid gap-6 sm:grid-cols-2">
                {SELF_HOSTED_POINTS.map((point) => (
                  <div key={point.title}>
                    <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                      <Check
                        className="size-4 shrink-0 text-emerald-500"
                        aria-hidden="true"
                      />
                      {point.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {point.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-12">
              <Button asChild variant="outline">
                <Link href={ROUTES.app.docs.gettingStarted}>
                  See the quickstart
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section
          id="automation"
          className="border-t border-border bg-muted/20 scroll-mt-20"
        >
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <div className="max-w-2xl">
              <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">
                Automate with MCP.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">
                TaskLabs ships a stateless MCP endpoint backed by
                workspace-scoped API keys — so scripts and AI agents can work
                your tasks without a browser session.
              </p>
            </div>

            <div className="mt-12 grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-6">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  POST /api/mcp
                </p>
                <CodeBlock
                  lang="curl"
                  className="mt-4 border-0 bg-muted/30"
                  code={[
                    "curl -sS https://your.domain/api/mcp \\",
                    "  -H 'Authorization: Bearer tlk_live_…' \\",
                    "  -H 'Content-Type: application/json' \\",
                    "  -H 'Accept: application/json' \\",
                    "  -H 'MCP-Protocol-Version: 2025-06-18' \\",
                    "  --data '{\"jsonrpc\":\"2.0\",\"id\":1,",
                    "    \"method\":\"tools/list\",\"params\":{}}'",
                  ].join('\n')}
                />
              </div>

              <div className="grid gap-5">
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                    <Bot className="size-4" aria-hidden="true" />
                    Works with AI agents and scripts
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Tools for tasks, events, labels, members, notifications,
                    search, profile, and Telegram — all scoped to the key’s
                    workspace.
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-card p-6">
                  <h3 className="flex items-center gap-2 text-[15px] font-semibold text-foreground">
                    <Server className="size-4" aria-hidden="true" />
                    Safe by design
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Keys are scope-limited, revocable, rotatable, and stored
                    hashed. The endpoint is stateless — no sessions, no SSE.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12">
              <Button asChild variant="outline">
                <Link href={ROUTES.app.docs.mcp}>
                  Configure MCP
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
            <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">
              Frequently asked questions
            </h2>
            <div className="mt-10 divide-y divide-border">
              {FAQ.map((item) => (
                <details key={item.question} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-foreground">
                    {item.question}
                    <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-muted/20">
          <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6 lg:px-8">
            <h2 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">
              Run TaskLabs on your own hardware today.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-muted-foreground">
              Docker Compose up, generate your keys, and complete setup in
              minutes.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" className="h-11 px-6">
                <Link href={ROUTES.app.setup}>
                  Get started
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-11 px-6">
                <Link href={ROUTES.app.docs.index}>Read the docs</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
