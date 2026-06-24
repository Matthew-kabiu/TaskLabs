export type CalendarView = 'month' | 'week' | 'day';

/** Return UTC Monday on or before `d`. */
function utcStartOfWeek(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun … 6=Sat
  // Monday = 1; distance back to Monday
  const offset = day === 0 ? 6 : day - 1;
  const result = new Date(d);
  result.setUTCDate(d.getUTCDate() - offset);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

/** Return UTC Sunday (end of week, Mon-start convention) at 23:59:59.999. */
function utcEndOfWeek(d: Date): Date {
  const start = utcStartOfWeek(d);
  const result = new Date(start);
  result.setUTCDate(start.getUTCDate() + 6);
  result.setUTCHours(23, 59, 59, 999);
  return result;
}

function utcStartOfMonth(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function utcEndOfDay(d: Date): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999),
  );
}

export function monthGridDays(cursor: Date): Date[] {
  const start = utcStartOfWeek(utcStartOfMonth(cursor));
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

export function weekDays(cursor: Date): Date[] {
  const start = utcStartOfWeek(cursor);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d;
  });
}

export function rangeForView(
  view: CalendarView,
  cursor: Date,
): { from: Date; to: Date } {
  if (view === 'month') {
    const days = monthGridDays(cursor);
    const lastDay = days[days.length - 1];
    return {
      from: days[0],
      to: utcEndOfDay(lastDay),
    };
  }
  if (view === 'week') {
    return {
      from: utcStartOfWeek(cursor),
      to: utcEndOfWeek(cursor),
    };
  }
  return { from: utcStartOfDay(cursor), to: utcEndOfDay(cursor) };
}
