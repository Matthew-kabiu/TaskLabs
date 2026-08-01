'use client';

import { useEffect, useMemo, useState } from 'react';
import { useIsHydrated } from '@/hooks/useIsHydrated';

/**
 * Returns the current time in a hydration-safe way.
 *
 * Reading `new Date()` directly during render makes the server-rendered markup
 * depend on the server clock and time zone, while the hydrating client uses its
 * own — so "is this today?" and "is this overdue?" can disagree and React
 * reports a hydration mismatch (and, near midnight, renders the wrong day).
 *
 * This hook returns `null` on the server and on the first client render, so
 * both produce identical markup. After hydration it returns a real `Date`.
 * Callers should treat `null` as "unknown yet" and skip time-dependent styling,
 * which resolves on the very next render.
 *
 * Pass `intervalMs` to keep the value ticking (for example, a calendar that
 * should roll over to the next day without a reload).
 */
export function useNow(intervalMs?: number): Date | null {
  const isHydrated = useIsHydrated();
  const [tickedAt, setTickedAt] = useState<number | null>(null);

  useEffect(() => {
    if (intervalMs === undefined) return;

    const timer = setInterval(() => setTickedAt(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);

  return useMemo(() => {
    if (!isHydrated) return null;
    return tickedAt === null ? new Date() : new Date(tickedAt);
  }, [isHydrated, tickedAt]);
}
