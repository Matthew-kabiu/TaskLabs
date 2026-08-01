/**
 * Centralized date/time formatting.
 *
 * Two problems this solves:
 *
 * 1. `Intl.DateTimeFormat` construction is expensive and was being repeated on
 *    every render at several call sites. Formatters are cached by style+zone.
 * 2. Passing `undefined` as the locale resolves differently on the server (ICU
 *    default, usually en-US) than in the browser (the visitor's locale), which
 *    produces hydration mismatches. The locale is pinned; callers that want the
 *    visitor's local clock should render through the `<DateTime>` component,
 *    which switches from UTC to local only after mount.
 */

export type DateTimeStyle = 'date' | 'datetime' | 'time' | 'month-short';

const FORMAT_LOCALE = 'en-US';

const STYLE_OPTIONS: Record<DateTimeStyle, Intl.DateTimeFormatOptions> = {
  date: { dateStyle: 'medium' },
  datetime: { dateStyle: 'medium', timeStyle: 'short' },
  time: { timeStyle: 'short' },
  'month-short': { month: 'short' },
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(
  style: DateTimeStyle,
  timeZone?: string,
): Intl.DateTimeFormat {
  const key = `${style}|${timeZone ?? 'local'}`;
  const cached = formatterCache.get(key);
  if (cached !== undefined) return cached;

  const formatter = new Intl.DateTimeFormat(FORMAT_LOCALE, {
    ...STYLE_OPTIONS[style],
    ...(timeZone === undefined ? {} : { timeZone }),
  });
  formatterCache.set(key, formatter);
  return formatter;
}

export function toDate(value: string | number | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateTime(
  value: string | number | Date | null | undefined,
  style: DateTimeStyle = 'datetime',
  timeZone?: string,
): string {
  if (value === null || value === undefined) return '';
  const date = toDate(value);
  if (date === null) return '';
  return getFormatter(style, timeZone).format(date);
}
