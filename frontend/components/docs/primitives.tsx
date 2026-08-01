import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function DocsH1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl font-light tracking-tight text-foreground md:text-4xl">
      {children}
    </h1>
  );
}

export function DocsLead({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 text-base leading-relaxed text-muted-foreground">
      {children}
    </p>
  );
}

export function DocsH2({ id, children }: { id: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 border-b border-border pb-3 text-xl font-medium tracking-tight text-foreground md:text-2xl"
    >
      {children}
    </h2>
  );
}

export function DocsP({ children }: { children: ReactNode }) {
  return (
    <p className="mt-4 text-[15px] leading-relaxed text-foreground/80">
      {children}
    </p>
  );
}

export function DocsList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 text-[15px] leading-relaxed text-foreground/80">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}

export function DocsInlineCode({ children }: { children: ReactNode }) {
  return (
    <code className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  );
}

export function DocsCallout({
  tone = 'info',
  title,
  children,
}: {
  tone?: 'info' | 'warning';
  title: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        'mt-6 rounded-md border px-4 py-3.5 text-sm leading-relaxed',
        tone === 'warning'
          ? 'border-amber-500/40 bg-amber-500/5 text-amber-700 dark:text-amber-300'
          : 'border-border bg-muted/40 text-foreground/80',
      )}
    >
      <p className="font-semibold">{title}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function DocsTable({
  head,
  rows,
}: {
  head: string[];
  rows: ReactNode[][];
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="bg-muted/40">
            {head.map((cell) => (
              <th
                key={cell}
                className="border-b border-border px-4 py-2.5 text-left font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className="odd:bg-background">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border-b border-border/60 px-4 py-2.5 align-top text-foreground/80 last:border-b-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
