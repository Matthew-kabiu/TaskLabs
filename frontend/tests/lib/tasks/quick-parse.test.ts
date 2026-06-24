import { describe, expect, it } from 'vitest';
import { parseQuickAdd } from '@/lib/tasks/quick-parse';

const NOW = new Date('2026-04-28T12:00:00Z'); // Tuesday

describe('parseQuickAdd', () => {
  it('parses a plain title', () => {
    const r = parseQuickAdd('Buy milk', NOW);
    expect(r.title).toBe('Buy milk');
    expect(r.priority).toBeUndefined();
    expect(r.dueDate).toBeUndefined();
  });

  it('extracts !high priority', () => {
    const r = parseQuickAdd('Buy milk !high', NOW);
    expect(r.title).toBe('Buy milk');
    expect(r.priority).toBe('HIGH');
  });

  it('extracts !urgent priority anywhere in string', () => {
    const r = parseQuickAdd('!urgent finish report', NOW);
    expect(r.title).toBe('finish report');
    expect(r.priority).toBe('URGENT');
  });

  it('parses "today"', () => {
    const r = parseQuickAdd('Call dentist today', NOW);
    expect(r.title).toBe('Call dentist');
    expect(r.dueDate?.toISOString().slice(0, 10)).toBe('2026-04-28');
  });

  it('parses "tomorrow"', () => {
    const r = parseQuickAdd('Buy groceries tomorrow', NOW);
    expect(r.title).toBe('Buy groceries');
    expect(r.dueDate?.toISOString().slice(0, 10)).toBe('2026-04-29');
  });

  it('parses combined !high + tomorrow', () => {
    const r = parseQuickAdd('Buy groceries !high tomorrow', NOW);
    expect(r.title).toBe('Buy groceries');
    expect(r.priority).toBe('HIGH');
    expect(r.dueDate?.toISOString().slice(0, 10)).toBe('2026-04-29');
  });

  it('parses weekday "friday" as next occurrence', () => {
    const r = parseQuickAdd('Submit report friday', NOW);
    expect(r.title).toBe('Submit report');
    expect(r.dueDate?.toISOString().slice(0, 10)).toBe('2026-05-01');
  });

  it('keeps unknown words in the title', () => {
    const r = parseQuickAdd('Email !low coworker about ABC', NOW);
    expect(r.title).toBe('Email coworker about ABC');
    expect(r.priority).toBe('LOW');
  });

  it('returns undefined priority for invalid !x token', () => {
    const r = parseQuickAdd('Foo !banana', NOW);
    expect(r.title).toBe('Foo !banana');
    expect(r.priority).toBeUndefined();
  });
});
