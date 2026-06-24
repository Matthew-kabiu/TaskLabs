import { describe, expect, it } from 'vitest';
import { buildRrule, parseRrule } from '@/lib/calendar/rrule-builder';

describe('rrule-builder', () => {
  it('returns null for none', () => {
    expect(buildRrule({ freq: 'NONE' })).toBeNull();
  });
  it('builds daily', () => {
    expect(buildRrule({ freq: 'DAILY' })).toBe('FREQ=DAILY');
  });
  it('builds weekly', () => {
    expect(buildRrule({ freq: 'WEEKLY' })).toBe('FREQ=WEEKLY');
  });
  it('builds monthly', () => {
    expect(buildRrule({ freq: 'MONTHLY' })).toBe('FREQ=MONTHLY');
  });
  it('builds yearly', () => {
    expect(buildRrule({ freq: 'YEARLY' })).toBe('FREQ=YEARLY');
  });
  it('parses', () => {
    expect(parseRrule('FREQ=WEEKLY')).toEqual({ freq: 'WEEKLY' });
    expect(parseRrule(null)).toEqual({ freq: 'NONE' });
  });
});
