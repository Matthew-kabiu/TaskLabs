import { describe, expect, it } from 'vitest';
import {
  expandOccurrences,
  nextOccurrence,
  type RecurringCalendarEvent,
} from '@/lib/recurrence';

function makeEvent(
  overrides: Partial<RecurringCalendarEvent> = {},
): RecurringCalendarEvent {
  return {
    id: 'e1',
    workspaceId: 'w1',
    creatorId: 'u1',
    title: 'Test',
    description: null,
    startAt: new Date('2026-05-04T09:00:00.000Z'),
    endAt: new Date('2026-05-04T10:00:00.000Z'),
    allDay: false,
    color: null,
    location: null,
    isPrivate: false,
    rrule: null,
    recurrenceParentId: null,
    ...overrides,
  };
}

const FROM = new Date('2026-05-01T00:00:00.000Z');
const TO = new Date('2026-05-31T23:59:59.999Z');

describe('expandOccurrences', () => {
  it('returns single occurrence for non-recurring event in range', () => {
    const out = expandOccurrences(makeEvent(), FROM, TO);
    expect(out).toHaveLength(1);
    expect(out[0].startAt.toISOString()).toBe('2026-05-04T09:00:00.000Z');
  });

  it('returns empty for non-recurring event outside range', () => {
    const e = makeEvent({
      startAt: new Date('2026-04-01T09:00:00.000Z'),
      endAt: new Date('2026-04-01T10:00:00.000Z'),
    });
    expect(expandOccurrences(e, FROM, TO)).toHaveLength(0);
  });

  it('expands a daily RRULE preserving duration', () => {
    const e = makeEvent({ rrule: 'FREQ=DAILY;COUNT=5' });
    const out = expandOccurrences(e, FROM, TO);
    expect(out).toHaveLength(5);
    out.forEach((o) => {
      expect(o.endAt.getTime() - o.startAt.getTime()).toBe(60 * 60 * 1000);
    });
    expect(out[0].startAt.toISOString()).toBe('2026-05-04T09:00:00.000Z');
    expect(out[4].startAt.toISOString()).toBe('2026-05-08T09:00:00.000Z');
  });

  it('expands a weekly RRULE within the window', () => {
    const e = makeEvent({ rrule: 'FREQ=WEEKLY;BYDAY=MO' });
    const out = expandOccurrences(e, FROM, TO);
    expect(out.length).toBeGreaterThanOrEqual(4);
    out.forEach((o) => expect(o.startAt.getUTCDay()).toBe(1));
  });

  it('expands a monthly RRULE within the window', () => {
    const e = makeEvent({
      startAt: new Date('2026-01-15T10:00:00.000Z'),
      endAt: new Date('2026-01-15T11:00:00.000Z'),
      rrule: 'FREQ=MONTHLY;BYMONTHDAY=15',
    });
    const out = expandOccurrences(
      e,
      new Date('2026-04-01T00:00:00.000Z'),
      new Date('2026-07-01T00:00:00.000Z'),
    );
    expect(out.map((o) => o.startAt.toISOString())).toEqual([
      '2026-04-15T10:00:00.000Z',
      '2026-05-15T10:00:00.000Z',
      '2026-06-15T10:00:00.000Z',
    ]);
  });

  it('returns occurrences whose interval overlaps window even if start is before from', () => {
    const e = makeEvent({
      startAt: new Date('2026-04-30T23:00:00.000Z'),
      endAt: new Date('2026-05-01T01:00:00.000Z'),
    });
    const out = expandOccurrences(e, FROM, TO);
    expect(out).toHaveLength(1);
  });

  it('attaches occurrenceStart for recurring events', () => {
    const e = makeEvent({ rrule: 'FREQ=DAILY;COUNT=2' });
    const out = expandOccurrences(e, FROM, TO);
    out.forEach((o) => expect(o.occurrenceStart).toBeInstanceOf(Date));
  });
});

describe('nextOccurrence', () => {
  it('returns startAt for non-recurring future event', () => {
    const e = makeEvent();
    const next = nextOccurrence(e, new Date('2026-05-01T00:00:00.000Z'));
    expect(next?.toISOString()).toBe('2026-05-04T09:00:00.000Z');
  });

  it('returns null when non-recurring event is past', () => {
    const e = makeEvent();
    const next = nextOccurrence(e, new Date('2027-01-01T00:00:00.000Z'));
    expect(next).toBeNull();
  });

  it('returns next instance for recurring event', () => {
    const e = makeEvent({ rrule: 'FREQ=DAILY' });
    const next = nextOccurrence(e, new Date('2026-05-10T12:00:00.000Z'));
    expect(next?.toISOString()).toBe('2026-05-11T09:00:00.000Z');
  });
});
