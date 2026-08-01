import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { absoluteUrl } from '@/lib/site';
import {
  DocsH1,
  DocsH2,
  DocsLead,
  DocsList,
  DocsP,
} from '@/components/docs/primitives';
import { JsonLd } from '@/components/marketing/json-ld';

export const metadata: Metadata = {
  title: 'TaskLabs documentation — Overview',
  description:
    'Learn how TaskLabs works: a self-hosted task and calendar manager built on Next.js and Convex.',
  alternates: { canonical: absoluteUrl('/docs') },
};

const BREADCRUMB_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'TaskLabs', item: absoluteUrl('/') },
    { '@type': 'ListItem', position: 2, name: 'Docs', item: absoluteUrl('/docs') },
  ],
};

const NEXT_STEPS = [
  {
    href: ROUTES.app.docs.gettingStarted,
    title: 'Quickstart',
    body: 'Install and run TaskLabs with Docker, then complete first-run setup.',
  },
  {
    href: ROUTES.app.docs.configuration,
    title: 'Configuration',
    body: 'Environment variables, origins, and CORS requirements.',
  },
  {
    href: ROUTES.app.docs.usage,
    title: 'Using TaskLabs',
    body: 'Tasks, calendar, workspaces, notifications, search, and Telegram.',
  },
  {
    href: ROUTES.app.docs.mcp,
    title: 'MCP & API keys',
    body: 'Automate TaskLabs with workspace-scoped keys and the MCP endpoint.',
  },
  {
    href: ROUTES.app.docs.deployment,
    title: 'Production',
    body: 'Deploy behind a proxy and run daily encrypted backups.',
  },
];

export default function DocsOverviewPage() {
  return (
    <>
      <JsonLd data={BREADCRUMB_JSONLD} />
      <DocsH1>TaskLabs documentation</DocsH1>
      <DocsLead>
        Self-hosted task and calendar management for teams. This guide covers
        running the product, configuring it, and automating it with the MCP
        endpoint.
      </DocsLead>

      <DocsH2 id="what-is-tasklabs">What is TaskLabs?</DocsH2>
      <DocsP>
        TaskLabs is a multi-tenant task and calendar manager built to run on
        infrastructure you control. Teams use it for Kanban boards, a shared
        calendar, realtime updates, and reminders that reach people on
        Telegram.
      </DocsP>
      <DocsList
        items={[
          <>Organize work visually with drag-and-drop Kanban boards.</>,
          <>Plan on a shared calendar with recurring events.</>,
          <>Work as a team in workspaces with invitations and roles.</>,
          <>Get deadline reminders through Telegram.</>,
          <>Automate it with the MCP endpoint and workspace-scoped API keys.</>,
        ]}
      />

      <DocsH2 id="architecture">Architecture</DocsH2>
      <DocsP>
        TaskLabs is a pnpm monorepo with two packages. The frontend is a
        Next.js 16 application; the backend is a self-hosted Convex deployment
        backed by Postgres. Authentication uses Convex Auth. The whole stack
        runs under Docker Compose.
      </DocsP>
      <DocsList
        items={[
          <>
            <strong>frontend/</strong> — the Next.js app users interact with.
          </>,
          <>
            <strong>backend/</strong> — the Convex project: schema, functions,
            services, and HTTP actions.
          </>,
          <>
            <strong>Postgres</strong> — the single storage engine for the
            Convex backend.
          </>,
          <>
            <strong>Docker Compose</strong> — Postgres, the Convex backend,
            the dashboard, the frontend, and a daily backup scheduler.
          </>,
        ]}
      />
      <DocsP>
        Every Convex query and mutation resolves the caller and scopes data to a
        workspace the caller belongs to, so multi-tenancy is enforced at the
        backend boundary.
      </DocsP>

      <DocsH2 id="features">What it does</DocsH2>
      <DocsList
        items={[
          <>Kanban boards with ordered stages and stable column widths.</>,
          <>A shared calendar with daily, weekly, and monthly recurrence.</>,
          <>Realtime updates across members — no refresh required.</>,
          <>Labels, assignees, workspace search, and a notification center.</>,
          <>Telegram reminders via encrypted token storage and webhook capture.</>,
          <>
            Automation through the MCP endpoint — a stateless JSON-RPC
            interface protected by API keys.
          </>,
        ]}
      />

      <DocsH2 id="next-steps">Next steps</DocsH2>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {NEXT_STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="group rounded-md border border-border p-4 transition-colors hover:border-foreground/40"
          >
            <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
              {step.title}
              <ArrowRight
                className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </span>
            <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
              {step.body}
            </span>
          </Link>
        ))}
      </div>
    </>
  );
}
