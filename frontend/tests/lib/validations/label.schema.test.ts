import { describe, expect, it } from 'vitest';
import { createLabelSchema, updateLabelSchema } from '@/lib/validations/label.schema';

describe('createLabelSchema', () => {
  it('accepts name + color', () => {
    expect(createLabelSchema.parse({ name: 'Bug', color: '#ef4444' })).toEqual({
      name: 'Bug',
      color: '#ef4444',
    });
  });

  it('rejects bad hex', () => {
    expect(() => createLabelSchema.parse({ name: 'x', color: 'red' })).toThrow();
  });

  it('rejects empty name', () => {
    expect(() => createLabelSchema.parse({ name: '', color: '#000000' })).toThrow();
  });
});

describe('updateLabelSchema', () => {
  it('allows partial updates', () => {
    expect(updateLabelSchema.parse({ name: 'New' })).toEqual({ name: 'New' });
  });

  it('rejects empty object', () => {
    expect(() => updateLabelSchema.parse({})).toThrow();
  });
});
