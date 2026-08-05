import { ArrowUpRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

type Accent = 'default' | 'warn' | 'danger' | 'good' | 'info';

interface ToneStyles {
  iconText: string;
  iconBg: string;
  ring: string;
  bar: string;
}

const TONES: Record<Accent, ToneStyles> = {
  default: {
    iconText: 'text-foreground',
    iconBg: 'bg-foreground/10',
    ring: 'ring-foreground/15',
    bar: 'bg-foreground/30',
  },
  info: {
    iconText: 'text-sky-400',
    iconBg: 'bg-sky-500/10',
    ring: 'ring-sky-500/20',
    bar: 'bg-sky-500/60',
  },
  warn: {
    iconText: 'text-amber-400',
    iconBg: 'bg-amber-500/10',
    ring: 'ring-amber-500/20',
    bar: 'bg-amber-500/60',
  },
  danger: {
    iconText: 'text-rose-400',
    iconBg: 'bg-rose-500/10',
    ring: 'ring-rose-500/20',
    bar: 'bg-rose-500/60',
  },
  good: {
    iconText: 'text-emerald-400',
    iconBg: 'bg-emerald-500/10',
    ring: 'ring-emerald-500/20',
    bar: 'bg-emerald-500/60',
  },
};

export function StatCard({
  icon: Icon,
  label,
  value,
  href,
  accent = 'default',
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  href: string;
  accent?: Accent;
  hint?: string;
}) {
  const tone = TONES[accent];
  const isZero = value === 0;
  return (
    <Link
      href={href}
      aria-label={`${label}: ${value}. View details`}
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 overflow-hidden rounded-lg border border-border/50 bg-background/60 p-3.5 transition-[color,background-color,border-color,box-shadow,transform]',
        'hover:-translate-y-0.5 hover:border-border hover:bg-muted/30 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      <span
        className={cn(
          'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors',
          tone.iconBg,
          tone.ring,
        )}
        aria-hidden
      >
        <Icon className={cn('h-4 w-4', tone.iconText)} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          {label}
        </p>
        {hint ? <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{hint}</p> : null}
      </div>
      <p
        className={cn(
          'text-3xl font-semibold tabular-nums tracking-tight',
          isZero ? 'text-muted-foreground/70' : 'text-foreground',
        )}
      >
        {value}
      </p>
      <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 transition-colors group-hover:text-foreground" aria-hidden />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity group-hover:opacity-100',
          tone.bar,
        )}
      />
    </Link>
  );
}
