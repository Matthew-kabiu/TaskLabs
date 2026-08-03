import { Check, ChevronDown, Plus, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type PreviewCard = {
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  label?: string;
  assignee?: string;
  done?: boolean;
};

const COLUMNS: {
  title: string;
  count: number;
  dot: string;
  cards: PreviewCard[];
}[] = [
  {
    title: 'Backlog',
    count: 1,
    dot: 'bg-zinc-400',
    cards: [
      {
        title: 'Migrate label sync to workspace scope',
        priority: 'Medium',
        label: 'Backend',
      },
    ],
  },
  {
    title: 'In Progress',
    count: 2,
    dot: 'bg-amber-500',
    cards: [
      {
        title: 'Daily backup to RustFS',
        priority: 'High',
        label: 'Ops',
        assignee: 'MK',
      },
      {
        title: 'Telegram chat linking flow',
        priority: 'Medium',
        label: 'Integration',
        assignee: 'JD',
      },
    ],
  },
  {
    title: 'Done',
    count: 1,
    dot: 'bg-emerald-500',
    cards: [
      {
        title: 'MCP tools/list over bearer auth',
        priority: 'High',
        label: 'Automation',
        assignee: 'MK',
        done: true,
      },
    ],
  },
];

const PRIORITY_DOT: Record<PreviewCard['priority'], string> = {
  Low: 'bg-sky-500',
  Medium: 'bg-amber-500',
  High: 'bg-orange-500',
};

export function ProductPreview() {
  return (
    <div
      aria-hidden="true"
      className="relative min-w-0 max-w-full overflow-hidden rounded-lg border border-border bg-card shadow-sm"
    >
      <div className="flex min-w-0 items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 sm:gap-3 sm:px-4">
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
          <span className="size-2.5 rounded-full bg-border" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
          <Search className="size-3.5 shrink-0" />
          <span className="truncate">Search tasks, events, members…</span>
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="rounded border border-border px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
            Product
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </div>
        <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-card bg-muted text-[10px] font-semibold text-muted-foreground">
          MK
        </span>
      </div>

      <div className="flex gap-2 overflow-hidden p-3 sm:gap-3 sm:p-4">
        {COLUMNS.map((column) => (
          <div
            key={column.title}
            className="flex w-[190px] shrink-0 flex-col rounded-lg border border-border bg-muted/30 sm:w-[220px]"
          >
            <header className="flex items-center justify-between border-b border-border/70 px-3 py-2">
              <h3 className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <span className={cn('size-2 rounded-full', column.dot)} />
                {column.title}
              </h3>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                {column.count}
              </span>
            </header>

            <div className="space-y-2.5 p-2.5">
              {column.cards.map((card) => (
                <div
                  key={card.title}
                  className="relative overflow-hidden rounded-md border border-border bg-card p-3 shadow-sm"
                >
                  <span
                    className={cn(
                      'absolute inset-y-0 left-0 w-0.5',
                      PRIORITY_DOT[card.priority],
                    )}
                  />
                  <p className="line-clamp-2 text-[13px] font-medium leading-snug text-foreground">
                    {card.title}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          PRIORITY_DOT[card.priority],
                        )}
                      />
                      {card.priority}
                    </span>
                    {card.label ? (
                      <span className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {card.label}
                      </span>
                    ) : null}
                    <span className="ml-auto grid size-5 place-items-center rounded-full border-2 border-card bg-muted text-[9px] font-semibold text-muted-foreground">
                      {card.assignee}
                    </span>
                  </div>
                  {card.done ? (
                    <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-emerald-500 text-white">
                      <Check className="size-3" strokeWidth={3} />
                    </span>
                  ) : null}
                </div>
              ))}

              <div className="flex items-center gap-1.5 rounded-md border border-dashed border-border px-2.5 py-2 text-xs text-muted-foreground">
                <Plus className="size-3.5" />
                <span>Add task</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
