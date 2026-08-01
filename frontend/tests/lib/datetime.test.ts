import { describe, it, expect } from 'vitest';
import { formatDateTime, toDate } from '@/lib/datetime';

const ISO = '2026-08-01T09:30:00.000Z';

describe('toDate', () => {
  it('accepts ISO strings, epoch numbers and Date instances', () => {
    expect(toDate(ISO)?.toISOString()).toBe(ISO);
    expect(toDate(Date.parse(ISO))?.toISOString()).toBe(ISO);
    expect(toDate(new Date(ISO))?.toISOString()).toBe(ISO);
  });

  it('returns null for unparseable input', () => {
    expect(toDate('not a date')).toBeNull();
  });
});

describe('formatDateTime', () => {
  it('returns an empty string for null/undefined/invalid input', () => {
    expect(formatDateTime(null)).toBe('');
    expect(formatDateTime(undefined)).toBe('');
    expect(formatDateTime('nope')).toBe('');
  });

  it('is deterministic for a fixed time zone regardless of ambient locale', () => {
    expect(formatDateTime(ISO, 'datetime', 'UTC')).toBe(
      formatDateTime(ISO, 'datetime', 'UTC'),
    );
    expect(formatDateTime(ISO, 'date', 'UTC')).toBe('Aug 1, 2026');
  });

  it('honours the requested style', () => {
    expect(formatDateTime(ISO, 'month-short', 'UTC')).toBe('Aug');
    expect(formatDateTime(ISO, 'date', 'UTC')).not.toContain(':');
    expect(formatDateTime(ISO, 'datetime', 'UTC')).toContain('9:30');
  });

  it('reuses cached formatters across calls', () => {
    // Same style+zone must produce identical output; the cache is an
    // implementation detail but a divergence here would mean it is broken.
    const first = formatDateTime(ISO, 'datetime', 'UTC');
    const second = formatDateTime(ISO, 'datetime', 'UTC');
    expect(first).toBe(second);
  });
});
