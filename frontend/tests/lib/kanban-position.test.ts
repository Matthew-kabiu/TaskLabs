import { describe, it, expect } from 'vitest';
import {
  computePosition,
  needsRebalance,
  rebalancePositions,
  REBALANCE_EPSILON,
} from '@/lib/kanban-position';

describe('computePosition', () => {
  it('returns 1024 when inserting into an empty column', () => {
    expect(computePosition(null, null)).toBe(1024);
  });

  it('returns prev + 1024 when appending to the end', () => {
    expect(computePosition(2048, null)).toBe(2048 + 1024);
  });

  it('returns next / 2 when prepending to the head', () => {
    expect(computePosition(null, 1024)).toBe(512);
  });

  it('returns the midpoint of prev and next', () => {
    expect(computePosition(1000, 2000)).toBe(1500);
  });

  it('handles fractional midpoints', () => {
    expect(computePosition(1, 2)).toBe(1.5);
  });
});

describe('needsRebalance', () => {
  it('is false when prev/next are well-separated', () => {
    expect(needsRebalance(1000, 2000)).toBe(false);
  });

  it('is true when the gap is below the epsilon', () => {
    expect(needsRebalance(1, 1 + REBALANCE_EPSILON / 2)).toBe(true);
  });

  it('is false when one neighbor is null', () => {
    expect(needsRebalance(null, 1000)).toBe(false);
    expect(needsRebalance(1000, null)).toBe(false);
    expect(needsRebalance(null, null)).toBe(false);
  });
});

describe('rebalancePositions', () => {
  it('assigns evenly-spaced positions starting at 1024 with step 1024', () => {
    const ids = ['a', 'b', 'c', 'd'];
    expect(rebalancePositions(ids)).toEqual([
      { id: 'a', position: 1024 },
      { id: 'b', position: 2048 },
      { id: 'c', position: 3072 },
      { id: 'd', position: 4096 },
    ]);
  });

  it('returns an empty array when given no ids', () => {
    expect(rebalancePositions([])).toEqual([]);
  });
});
