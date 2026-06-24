import type { LucideIcon } from 'lucide-react';
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
  accent = 'default',
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  accent?: Accent;
  hint?: string;
}) {
  const tone = TONES[accent];
  const isZero = value === 0;
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border border-border/50 bg-card p-4 transition-all',
        'hover:-translate-y-0.5 hover:border-border hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.5)]',
      )}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p
            className={cn(
              'mt-2 text-3xl font-semibold tabular-nums tracking-tight',
              isZero ? 'text-muted-foreground/70' : 'text-foreground',
            )}
          >
            {value}
          </p>
          {hint && (
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          )}
        </div>
        <span
          className={cn(
            'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 transition-colors',
            tone.iconBg,
            tone.ring,
          )}
          aria-hidden
        >
          <Icon className={cn('h-4 w-4', tone.iconText)} />
        </span>
      </div>
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-x-0 bottom-0 h-px opacity-0 transition-opacity group-hover:opacity-100',
          tone.bar,
        )}
      />
    </div>
  );
}
