'use client';

import { formatDateTime, toDate, type DateTimeStyle } from '@/lib/datetime';
import { useIsHydrated } from '@/hooks/useIsHydrated';

/**
 * Renders a timestamp without a hydration mismatch.
 *
 * The server and the first client render both format in UTC so the markup
 * matches. After mount we re-render in the visitor's own time zone, which is
 * what they actually want to read. The machine-readable ISO value always stays
 * on the `datetime` attribute.
 */
export function DateTime({
  value,
  style = 'datetime',
  className,
}: {
  value: string | number | Date | null | undefined;
  style?: DateTimeStyle;
  className?: string;
}) {
  const isHydrated = useIsHydrated();

  const date = value === null || value === undefined ? null : toDate(value);
  if (date === null) return null;

  return (
    <time
      dateTime={date.toISOString()}
      className={className}
      suppressHydrationWarning
    >
      {formatDateTime(date, style, isHydrated ? undefined : 'UTC')}
    </time>
  );
}
