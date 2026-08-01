'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { DOC_NAV, DOC_TOC, docNeighbors } from '@/lib/docs';
import { cn } from '@/lib/utils';
import { BackToHome } from '@/components/back-to-home';
import { SiteHeader } from '@/components/marketing/site-header';
import { SiteFooter } from '@/components/marketing/site-footer';

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const neighbors = docNeighbors(pathname);
  const toc = DOC_TOC[pathname] ?? [];

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <SiteHeader variant="docs" />

      <nav
        aria-label="Documentation sections"
        className="sticky top-16 z-30 border-b border-border bg-background/85 backdrop-blur lg:hidden"
      >
        <div className="flex gap-2 overflow-x-auto px-4 py-3 sm:px-6">
          {DOC_NAV.map((item) => (
            <Link
              key={item.slug}
              href={item.slug}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] transition-colors',
                pathname === item.slug
                  ? 'border-foreground bg-foreground text-primary-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground',
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[216px_minmax(0,1fr)] xl:grid-cols-[216px_minmax(0,1fr)_180px]">
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto py-12 pr-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Documentation
              </p>
              <nav aria-label="Documentation" className="mt-4 space-y-1">
                {DOC_NAV.map((item) => (
                  <Link
                    key={item.slug}
                    href={item.slug}
                    aria-current={pathname === item.slug ? 'page' : undefined}
                    className={cn(
                      'block rounded-md border-l-2 px-3 py-2 text-sm transition-colors',
                      pathname === item.slug
                        ? 'border-foreground bg-accent font-medium text-foreground'
                        : 'border-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    {item.title}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>

          <main className="min-w-0 py-12">
            <div className="mb-8 flex items-center justify-between gap-3">
              <BackToHome />
            </div>

            <nav
              aria-label="Breadcrumb"
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground"
            >              <Link href="/" className="transition-colors hover:text-foreground">
                TaskLabs
              </Link>
              <span aria-hidden="true">/</span>
              <Link
                href="/docs"
                className="transition-colors hover:text-foreground"
              >
                Docs
              </Link>
              {pathname !== '/docs' ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span className="text-foreground">
                    {DOC_NAV.find((item) => item.slug === pathname)?.title}
                  </span>
                </>
              ) : null}
            </nav>

            <article className="max-w-3xl">{children}</article>

            <div className="mt-16 grid gap-3 border-t border-border pt-8 sm:grid-cols-2">
              {neighbors.prev ? (
                <Link
                  href={neighbors.prev.slug}
                  className="group rounded-md border border-border p-4 transition-colors hover:border-foreground/40"
                >
                  <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    <ArrowLeft
                      className="size-3 transition-transform group-hover:-translate-x-0.5"
                      aria-hidden="true"
                    />
                    Previous
                  </span>
                  <span className="mt-1.5 block text-sm font-medium text-foreground">
                    {neighbors.prev.title}
                  </span>
                </Link>
              ) : (
                <span />
              )}
              {neighbors.next ? (
                <Link
                  href={neighbors.next.slug}
                  className="group rounded-md border border-border p-4 text-right transition-colors hover:border-foreground/40"
                >
                  <span className="flex items-center justify-end gap-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    Next
                    <ArrowRight
                      className="size-3 transition-transform group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-1.5 block text-sm font-medium text-foreground">
                    {neighbors.next.title}
                  </span>
                </Link>
              ) : null}
            </div>
          </main>

          {toc.length > 0 ? (
            <aside className="hidden xl:block">
              <div className="sticky top-24 max-h-[calc(100dvh-8rem)] overflow-y-auto py-12">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  On this page
                </p>
                <nav aria-label="On this page" className="mt-4 space-y-1">
                  {toc.map((item) => (
                    <a
                      key={item.id}
                      href={`#${item.id}`}
                      className="block border-l-2 border-transparent px-3 py-1.5 text-[13px] leading-snug text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                    >
                      {item.label}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          ) : null}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
