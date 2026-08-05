import { cn } from '@/lib/utils';

export function TaskLabsMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-grid size-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-[#171717] text-white shadow-sm',
        className,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="none">
        <path d="M6.5 8.5v7M12 6.5v11M17.5 8.5v7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

export function TaskLabsLogo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-foreground', className)}>
      <TaskLabsMark className={markClassName} />
      {!compact ? (
        <span className="text-[15px] font-semibold tracking-tight">TaskLabs</span>
      ) : null}
    </span>
  );
}
