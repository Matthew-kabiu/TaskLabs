'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useQuery } from 'convex/react';
import { ArrowRight, Kanban, Menu, X } from 'lucide-react';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type SiteHeaderLink = { label: string; href: string };

const MARKETING_LINKS: SiteHeaderLink[] = [
  { label: 'Features', href: '/#features' },
  { label: 'Self-hosted', href: '/#self-hosted' },
  { label: 'Automation', href: '/#automation' },
  { label: 'Docs', href: ROUTES.app.docs.index },
];

const DOCS_LINKS: SiteHeaderLink[] = [
  { label: 'Home', href: ROUTES.app.landing },
  { label: 'Overview', href: ROUTES.app.docs.index },
  { label: 'Quickstart', href: ROUTES.app.docs.gettingStarted },
  { label: 'Configuration', href: ROUTES.app.docs.configuration },
  { label: 'Using TaskLabs', href: ROUTES.app.docs.usage },
  { label: 'MCP & API keys', href: ROUTES.app.docs.mcp },
  { label: 'Production', href: ROUTES.app.docs.deployment },
];

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 text-foreground',
        className,
      )}
    >
      <span className="grid size-7 place-items-center rounded-md border border-border bg-muted text-foreground">
        <Kanban className="size-4" aria-hidden="true" />
      </span>
      <span className="text-[15px] font-semibold tracking-tight">TaskLabs</span>
    </span>
  );
}

const GITHUB_URL = 'https://github.com/Matthew-kabiu/TaskLabs';

function GithubIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55v-2.15c-3.2.7-3.87-1.54-3.87-1.54-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.49-.28-5.11-1.25-5.11-5.55 0-1.23.44-2.23 1.16-3.02-.12-.28-.5-1.42.11-2.96 0 0 .95-.3 3.11 1.15a10.8 10.8 0 0 1 5.66 0c2.16-1.45 3.11-1.15 3.11-1.15.61 1.54.23 2.68.11 2.96.72.79 1.16 1.79 1.16 3.02 0 4.31-2.62 5.27-5.12 5.55.4.35.76 1.03.76 2.08v3.08c0 .3.21.66.8.55A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
  );
}

function isActive(href: string, pathname: string): boolean {
  if (href === ROUTES.app.landing) return pathname === ROUTES.app.landing;
  if (href === ROUTES.app.docs.index && pathname.startsWith('/docs')) return true;
  if (href.startsWith('/docs')) return pathname === href;
  return false;
}

export function SiteHeader({ variant = 'marketing' }: { variant?: 'marketing' | 'docs' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const links = variant === 'docs' ? DOCS_LINKS : MARKETING_LINKS;
  const setupStatus = useQuery(BACKEND_ROUTES.setup.status, {}) as
    | { setupNeeded: boolean }
    | undefined;
  const setupDone = setupStatus?.setupNeeded === false;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          href={ROUTES.app.landing}
          aria-label="TaskLabs home"
          className="shrink-0"
        >
          <BrandMark />
        </Link>

        <nav
          aria-label="Main"
          className="hidden items-center gap-1 lg:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                isActive(link.href, pathname)
                  ? 'text-foreground'
                  : 'text-muted-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="TaskLabs on GitHub"
            className="grid size-9 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <GithubIcon className="size-4" />
          </a>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground"
          >
            <Link href={ROUTES.app.login}>Sign in</Link>
          </Button>
          {!setupDone ? (
            <Button asChild size="sm">
              <Link href={ROUTES.app.setup}>
                Get started
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </Button>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="inline-flex size-9 items-center justify-center rounded-md border border-border text-foreground lg:hidden"
        >
          {open ? (
            <X className="size-4" aria-hidden="true" />
          ) : (
            <Menu className="size-4" aria-hidden="true" />
          )}
          <span className="sr-only">Toggle navigation</span>
        </button>
      </div>

      {open ? (
        <div id="mobile-nav" className="border-t border-border bg-background lg:hidden">
          <nav aria-label="Mobile" className="mx-auto max-w-7xl space-y-1 px-4 py-4 sm:px-6">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={cn(
                  'block rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  isActive(link.href, pathname)
                    ? 'text-foreground'
                    : 'text-muted-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex items-center gap-3 pt-3">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TaskLabs on GitHub"
                className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <GithubIcon className="size-4" />
              </a>
              <Button
                asChild
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Link href={ROUTES.app.login} onClick={() => setOpen(false)}>
                  Sign in
                </Link>
              </Button>
              {!setupDone ? (
                <Button asChild size="sm" className="flex-1">
                  <Link href={ROUTES.app.setup} onClick={() => setOpen(false)}>
                    Get started
                  </Link>
                </Button>
              ) : null}
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
