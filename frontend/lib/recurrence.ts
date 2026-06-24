import { RRule, RRuleSet, rrulestr } from 'rrule';

export interface ExpandedOccurrence
  extends Omit<RecurringCalendarEvent, 'startAt' | 'endAt'> {
  startAt: Date;
  endAt: Date;
  occurrenceStart: Date;
}

export interface RecurringCalendarEvent {
  id: string;
  workspaceId: string;
  creatorId: string;
  title: string;
  description: string | null;
  startAt: Date;
  endAt: Date;
  allDay: boolean;
  color: string | null;
  location: string | null;
  isPrivate: boolean;
  rrule: string | null;
  recurrenceParentId?: string | null;
}

function buildRule(event: RecurringCalendarEvent): RRule | RRuleSet | null {
  if (!event.rrule) return null;
  const trimmed = event.rrule.trim();
  const body = trimmed.startsWith('RRULE:') ? trimmed.slice(6) : trimmed;
  try {
    const rule = rrulestr(`DTSTART:${toBasicUTC(event.startAt)}\nRRULE:${body}`, {
      forceset: false,
    });
    return rule;
  } catch {
    return null;
  }
}

function toBasicUTC(d: Date): string {
  const pad = (n: number, w = 2) => n.toString().padStart(w, '0');
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export function expandOccurrences(
  event: RecurringCalendarEvent,
  fromDate: Date,
  toDate: Date,
): ExpandedOccurrence[] {
  const duration = event.endAt.getTime() - event.startAt.getTime();

  if (!event.rrule) {
    const overlaps =
      event.endAt.getTime() >= fromDate.getTime() &&
      event.startAt.getTime() <= toDate.getTime();
    if (!overlaps) return [];
    return [
      {
        ...event,
        startAt: event.startAt,
        endAt: event.endAt,
        occurrenceStart: event.startAt,
      },
    ];
  }

  const rule = buildRule(event);
  if (!rule) return [];

  // Pull occurrences whose start is at most `duration` before `fromDate` so
  // overlapping intervals are included.
  const lookbackStart = new Date(fromDate.getTime() - duration);
  const starts = rule.between(lookbackStart, toDate, true);

  return starts.map((start) => ({
    ...event,
    startAt: start,
    endAt: new Date(start.getTime() + duration),
    occurrenceStart: start,
  }));
}

export function nextOccurrence(event: RecurringCalendarEvent, after: Date): Date | null {
  if (!event.rrule) {
    return event.startAt.getTime() > after.getTime() ? event.startAt : null;
  }
  const rule = buildRule(event);
  if (!rule) return null;
  return rule.after(after, false);
}
