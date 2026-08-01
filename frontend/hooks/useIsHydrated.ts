'use client';

import { useSyncExternalStore } from 'react';

// The store never emits: the value flips exactly once, when React swaps the
// server snapshot for the client snapshot after hydration.
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

/**
 * Returns `false` during server rendering and the first client render, then
 * `true` once hydration has completed.
 *
 * This is the supported way to gate browser-only values (the current time, the
 * visitor's time zone) without a hydration mismatch. `useSyncExternalStore`
 * takes a dedicated server snapshot, so React renders the server value while
 * hydrating and re-renders with the client value afterwards — no `useEffect`
 * + `setState` cascade, which the `react-hooks/set-state-in-effect` rule
 * rightly rejects.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
