import Link from 'next/link';
import { ROUTES } from '@/lib/routes';
import { BrandMark } from './site-header';

const PRODUCT_LINKS = [
  { label: 'Features', href: '/#features' },
  { label: 'Self-hosted', href: '/#self-hosted' },
  { label: 'Automation', href: '/#automation' },
  { label: 'Get started', href: ROUTES.app.setup },
];

const DOCUMENTATION_LINKS = [
  { label: 'Overview', href: ROUTES.app.docs.index },
  { label: 'Quickstart', href: ROUTES.app.docs.gettingStarted },
  { label: 'Configuration', href: ROUTES.app.docs.configuration },
  { label: 'MCP & API keys', href: ROUTES.app.docs.mcp },
  { label: 'Production', href: ROUTES.app.docs.deployment },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-[1.5fr_1fr_1fr]">
          <div className="space-y-4">
            <Link href={ROUTES.app.landing} aria-label="TaskLabs home">
              <BrandMark />
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
              Self-hosted task and calendar management for teams. Your boards,
              your calendar, your data — on infrastructure you control.
            </p>
          </div>

          <nav aria-label="Product">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Product
            </h2>
            <ul className="mt-4 space-y-2.5">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-label="Documentation">
            <h2 className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
              Documentation
            </h2>
            <ul className="mt-4 space-y-2.5">
              {DOCUMENTATION_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-foreground/80 transition-colors hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Built to self-host.</span>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.spookielabsinc.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              Made by SpookieLabsInc
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="https://www.spookielabsinc.site/"
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors hover:text-foreground"
            >
              IoT
            </a>
          </div>
          <span>© {new Date().getFullYear()} TaskLabs</span>
        </div>
      </div>
    </footer>
  );
}
