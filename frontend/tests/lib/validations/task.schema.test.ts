import { describe, expect, it } from 'vitest';
import {
  createTaskSchema,
  updateTaskSchema,
  reorderTasksSchema,
  listTasksQuerySchema,
} from '@/lib/validations/task.schema';

describe('createTaskSchema', () => {
  it('accepts a minimal title-only payload', () => {
    const r = createTaskSchema.parse({ title: 'Buy milk' });
    expect(r.title).toBe('Buy milk');
    expect(r.priority).toBe('MEDIUM');
    expect(r.status).toBe('TODO');
    expect(r.isPrivate).toBe(false);
  });

  it('rejects empty title', () => {
    expect(() => createTaskSchema.parse({ title: '' })).toThrow();
  });

  it('rejects title >200 chars', () => {
    expect(() => createTaskSchema.parse({ title: 'x'.repeat(201) })).toThrow();
  });

  it('coerces ISO due date to Date', () => {
    const r = createTaskSchema.parse({ title: 'x', dueDate: '2026-05-01T10:00:00Z' });
    expect(r.dueDate).toBeInstanceOf(Date);
  });

  it('accepts assigneeIds and labelIds arrays', () => {
    const r = createTaskSchema.parse({
      title: 'x',
      assigneeIds: ['a', 'b'],
      labelIds: ['l1'],
    });
    expect(r.assigneeIds).toEqual(['a', 'b']);
    expect(r.labelIds).toEqual(['l1']);
  });

  it('rejects unknown priority', () => {
    expect(() => createTaskSchema.parse({ title: 'x', priority: 'NUCLEAR' })).toThrow();
  });
});

describe('updateTaskSchema', () => {
  it('allows partial updates', () => {
    const r = updateTaskSchema.parse({ status: 'DONE' });
    expect(r.status).toBe('DONE');
  });

  it('allows clearing dueDate via null', () => {
    const r = updateTaskSchema.parse({ dueDate: null });
    expect(r.dueDate).toBeNull();
  });

  it('rejects empty object', () => {
    expect(() => updateTaskSchema.parse({})).toThrow();
  });
});

describe('reorderTasksSchema', () => {
  it('accepts an array of {id, position}', () => {
    const r = reorderTasksSchema.parse({
      items: [
        { id: 'a', position: 1.5 },
        { id: 'b', position: 2 },
      ],
    });
    expect(r.items).toHaveLength(2);
  });

  it('rejects empty items', () => {
    expect(() => reorderTasksSchema.parse({ items: [] })).toThrow();
  });
});

describe('listTasksQuerySchema', () => {
  it('parses query strings with optional filters', () => {
    const r = listTasksQuerySchema.parse({
      status: 'TODO',
      priority: 'HIGH',
      q: 'buy',
      sort: 'dueDate',
    });
    expect(r.status).toBe('TODO');
    expect(r.sort).toBe('dueDate');
  });

  it('defaults sort to "manual"', () => {
    const r = listTasksQuerySchema.parse({});
    expect(r.sort).toBe('manual');
  });
});
