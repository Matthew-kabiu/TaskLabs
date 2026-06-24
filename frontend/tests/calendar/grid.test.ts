import { describe, expect, it } from 'vitest';
import {
  monthGridDays,
  weekDays,
  rangeForView,
} from '@/lib/calendar/grid';

describe('monthGridDays', () => {
  it('returns 42 days starting on Monday for May 2026', () => {
    const days = monthGridDays(new Date('2026-05-15T00:00:00.000Z'));
    expect(days).toHaveLength(42);
    expect(days[0].getUTCDay()).toBe(1); // Monday
  });
});

describe('weekDays', () => {
  it('returns 7 days starting Monday', () => {
    const days = weekDays(new Date('2026-05-06T00:00:00.000Z'));
    expect(days).toHaveLength(7);
    expect(days[0].getUTCDay()).toBe(1);
  });
});

describe('rangeForView', () => {
  it('month range covers full grid', () => {
    const r = rangeForView('month', new Date('2026-05-15T00:00:00.000Z'));
    expect(r.from.getUTCDay()).toBe(1);
    expect(r.to.getTime() - r.from.getTime()).toBeGreaterThan(40 * 86400_000);
  });
  it('week range is 7 days', () => {
    const r = rangeForView('week', new Date('2026-05-06T00:00:00.000Z'));
    const days = (r.to.getTime() - r.from.getTime()) / 86400_000;
    expect(days).toBeGreaterThan(6.9);
    expect(days).toBeLessThan(7.1);
  });
  it('day range is 1 day', () => {
    const r = rangeForView('day', new Date('2026-05-06T00:00:00.000Z'));
    const days = (r.to.getTime() - r.from.getTime()) / 86400_000;
    expect(days).toBeGreaterThan(0.99);
    expect(days).toBeLessThan(1.01);
  });
});
