import { describe, expect, it } from 'vitest';
import {
  eventCreateSchema,
  eventUpdateSchema,
  eventListQuerySchema,
} from '@/lib/validations/event.schema';

describe('event.schema', () => {
  const base = {
    title: 'Standup',
    startAt: '2026-05-01T09:00:00.000Z',
    endAt: '2026-05-01T09:30:00.000Z',
    allDay: false,
    isPrivate: false,
  };

  it('accepts a minimal valid create payload', () => {
    const parsed = eventCreateSchema.parse(base);
    expect(parsed.title).toBe('Standup');
    expect(parsed.startAt).toBeInstanceOf(Date);
  });

  it('rejects when endAt is before startAt', () => {
    const bad = { ...base, endAt: '2026-05-01T08:00:00.000Z' };
    expect(() => eventCreateSchema.parse(bad)).toThrow();
  });

  it('accepts an optional rrule string', () => {
    const parsed = eventCreateSchema.parse({
      ...base,
      rrule: 'FREQ=DAILY;COUNT=5',
    });
    expect(parsed.rrule).toBe('FREQ=DAILY;COUNT=5');
  });

  it('rejects unknown color hue ids', () => {
    expect(() =>
      eventCreateSchema.parse({ ...base, color: 'puce' }),
    ).toThrow();
  });

  it('update schema makes every field optional', () => {
    const parsed = eventUpdateSchema.parse({ title: 'Renamed' });
    expect(parsed.title).toBe('Renamed');
  });

  it('list query requires from + to and parses to Date', () => {
    const parsed = eventListQuerySchema.parse({
      from: '2026-05-01T00:00:00.000Z',
      to: '2026-05-31T23:59:59.999Z',
    });
    expect(parsed.from.getUTCMonth()).toBe(4);
    expect(parsed.to.getUTCMonth()).toBe(4);
  });

  it('list query rejects when from >= to', () => {
    expect(() =>
      eventListQuerySchema.parse({
        from: '2026-05-31T00:00:00.000Z',
        to: '2026-05-01T00:00:00.000Z',
      }),
    ).toThrow();
  });
});
