'use client';
import Link from 'next/link';
import { format, isSameDay, parseISO } from 'date-fns';
import { CalendarDays, ListChecks, ArrowUpRight } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { EmptyState } from '@/components/empty-state';
import { cn } from '@/lib/utils';
import { useNow } from '@/hooks/useNow';

type Item = { kind: 'task' | 'event'; id: string; title: string; at: string };

export function NextSevenDays({ items }: { items: Item[] }) {
  // Declared before the early return so hook order stays stable.
  const now = useNow();

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-medium">Next 7 days</h3>
        <EmptyState icon={CalendarDays} title="A clear week ahead" action={null} />
      </div>
    );
  }

  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    const d = parseISO(it.at);
    const k = format(d, 'yyyy-MM-dd');
    if (!byDay.has(k)) byDay.set(k, []);
    byDay.get(k)!.push(it);
  }

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <h3 className="mb-3 text-sm font-medium">Next 7 days</h3>
      <ol className="space-y-4">
        {[...byDay.entries()].map(([day, list]) => {
          const d = parseISO(day);
          return (
            <li key={day}>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                {now !== null && isSameDay(d, now)
                  ? 'Today'
                  : format(d, 'EEE, MMM d')}
              </div>
              <ul className="space-y-1">
                {list.map((i) => {
                  const href =
                    i.kind === 'task'
                      ? ROUTES.app.task(i.id)
                      : `${ROUTES.app.calendar}?event=${i.id}`;
                  const isEvent = i.kind === 'event';
                  const Icon = isEvent ? CalendarDays : ListChecks;
                  return (
                    <li key={`${i.kind}-${i.id}`}>
                      <Link
                        href={href}
                        className="group flex items-center gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-muted/60"
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-md border',
                            isEvent
                              ? 'border-sky-500/30 bg-sky-500/10 text-sky-500'
                              : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-500',
                          )}
                          aria-hidden
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <span className="flex min-w-0 flex-1 items-baseline justify-between gap-3">
                          <span className="truncate text-sm">{i.title}</span>
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                            {format(parseISO(i.at), 'p')}
                          </span>
                        </span>
                        <ArrowUpRight
                          aria-hidden
                          className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-colors group-hover:text-foreground"
                        />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
