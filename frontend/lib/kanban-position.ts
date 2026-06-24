// lib/kanban-position.ts

/**
 * The minimum gap allowed between two adjacent float positions before
 * we trigger a rebalance. 0.0001 keeps us comfortably above
 * Number.EPSILON for any realistic Postgres double-precision storage.
 */
export const REBALANCE_EPSILON = 0.0001;

/** Default spacing used when seeding/rebalancing a column. */
export const POSITION_STEP = 1024;

/**
 * Compute a new `position` for a card inserted between `prev` and `next`.
 * Either neighbor may be null (head/tail/empty insertion).
 */
export function computePosition(
  prev: number | null,
  next: number | null,
): number {
  if (prev === null && next === null) return POSITION_STEP;
  if (prev === null && next !== null) return next / 2;
  if (prev !== null && next === null) return prev + POSITION_STEP;
  return (prev! + next!) / 2;
}

/**
 * Returns true if the gap between `prev` and `next` has degraded below
 * the epsilon, signalling the caller should rebalance the column.
 */
export function needsRebalance(
  prev: number | null,
  next: number | null,
): boolean {
  if (prev === null || next === null) return false;
  return Math.abs(next - prev) < REBALANCE_EPSILON;
}

/**
 * Produce evenly-spaced positions for the given ordered list of ids.
 * Used to send an all-positions PATCH when precision degrades.
 */
export function rebalancePositions(
  ids: string[],
): { id: string; position: number }[] {
  return ids.map((id, i) => ({ id, position: (i + 1) * POSITION_STEP }));
}
