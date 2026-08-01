import { describe, it, expect } from 'vitest';
import {
  applyScheduleConstraints,
  scheduleChanged,
  DEFAULT_EVENT_DURATION_MS,
} from '@/lib/calendar/schedule-constraints';

const at = (iso: string) => new Date(iso);

describe('applyScheduleConstraints', () => {
  const now = at('2026-08-01T12:00:00.000Z');

  it('pushes a new event start up to now when it is in the past', () => {
    const result = applyScheduleConstraints(
      { startAt: at('2026-08-01T09:00:00.000Z'), endAt: at('2026-08-01T18:00:00.000Z') },
      { now, isEdit: false },
    );

    expect(result.startAt).toEqual(now);
    expect(result.endAt).toEqual(at('2026-08-01T18:00:00.000Z'));
  });

  it('leaves an existing event in the past alone', () => {
    const window = {
      startAt: at('2026-07-01T09:00:00.000Z'),
      endAt: at('2026-07-01T10:00:00.000Z'),
    };
    const result = applyScheduleConstraints(window, { now, isEdit: true });

    expect(result.startAt).toBe(window.startAt);
    expect(result.endAt).toBe(window.endAt);
  });

  it('applies no lower bound before hydration (now === null)', () => {
    const window = {
      startAt: at('2026-08-01T09:00:00.000Z'),
      endAt: at('2026-08-01T10:00:00.000Z'),
    };
    const result = applyScheduleConstraints(window, { now: null, isEdit: false });

    expect(result.startAt).toBe(window.startAt);
  });

  it('pushes end out to the default duration when it is not after start', () => {
    const start = at('2026-08-01T15:00:00.000Z');
    const result = applyScheduleConstraints(
      { startAt: start, endAt: at('2026-08-01T15:00:00.000Z') },
      { now, isEdit: true },
    );

    expect(result.endAt.getTime()).toBe(start.getTime() + DEFAULT_EVENT_DURATION_MS);
  });

  it('corrects both bounds in a single pass', () => {
    const result = applyScheduleConstraints(
      { startAt: at('2026-08-01T08:00:00.000Z'), endAt: at('2026-08-01T08:30:00.000Z') },
      { now, isEdit: false },
    );

    expect(result.startAt).toEqual(now);
    expect(result.endAt.getTime()).toBe(now.getTime() + DEFAULT_EVENT_DURATION_MS);
  });

  it('returns the identical instances when nothing needs correcting', () => {
    const window = {
      startAt: at('2026-08-01T13:00:00.000Z'),
      endAt: at('2026-08-01T14:00:00.000Z'),
    };
    const result = applyScheduleConstraints(window, { now, isEdit: false });

    expect(result.startAt).toBe(window.startAt);
    expect(result.endAt).toBe(window.endAt);
    expect(scheduleChanged(window, result)).toBe(false);
  });
});

describe('scheduleChanged', () => {
  it('detects a moved bound', () => {
    const a = {
      startAt: at('2026-08-01T13:00:00.000Z'),
      endAt: at('2026-08-01T14:00:00.000Z'),
    };
    expect(
      scheduleChanged(a, { ...a, endAt: at('2026-08-01T15:00:00.000Z') }),
    ).toBe(true);
  });

  it('compares by value, not identity', () => {
    const a = {
      startAt: at('2026-08-01T13:00:00.000Z'),
      endAt: at('2026-08-01T14:00:00.000Z'),
    };
    const b = {
      startAt: at('2026-08-01T13:00:00.000Z'),
      endAt: at('2026-08-01T14:00:00.000Z'),
    };
    expect(scheduleChanged(a, b)).toBe(false);
  });
});
