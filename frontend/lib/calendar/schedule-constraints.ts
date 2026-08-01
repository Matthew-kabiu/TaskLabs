export const DEFAULT_EVENT_DURATION_MS = 60 * 60 * 1000;

export interface ScheduleWindow {
  startAt: Date;
  endAt: Date;
}

/**
 * Enforces the two scheduling rules for a calendar event:
 *
 * 1. A **new** event may not start in the past. Existing events are left alone
 *    so historical entries stay editable.
 * 2. The end must be strictly after the start; otherwise it is pushed out to
 *    the default duration.
 *
 * Pure and total, so it can be applied during render in one pass instead of via
 * chained effects that each trigger another commit. Returns the *same* `Date`
 * instances when nothing needs correcting, letting callers skip a `setState`
 * with a cheap identity check.
 */
export function applyScheduleConstraints(
  window: ScheduleWindow,
  options: { now: Date | null; isEdit: boolean },
): ScheduleWindow {
  const { now, isEdit } = options;

  let startAt = window.startAt;
  if (!isEdit && now !== null && startAt.getTime() < now.getTime()) {
    startAt = now;
  }

  let endAt = window.endAt;
  if (endAt.getTime() <= startAt.getTime()) {
    endAt = new Date(startAt.getTime() + DEFAULT_EVENT_DURATION_MS);
  }

  return { startAt, endAt };
}

/** True when `next` differs from `current` in either bound. */
export function scheduleChanged(
  current: ScheduleWindow,
  next: ScheduleWindow,
): boolean {
  return (
    current.startAt.getTime() !== next.startAt.getTime() ||
    current.endAt.getTime() !== next.endAt.getTime()
  );
}
