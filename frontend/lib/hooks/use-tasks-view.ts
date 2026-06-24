'use client';

import { useCallback, useSyncExternalStore } from 'react';

export type TasksView = 'list' | 'kanban';
const STORAGE_KEY = 'tl_tasks_view';

function readStored(): TasksView {
  if (typeof window === 'undefined') return 'list';
  const raw = window.localStorage.getItem(STORAGE_KEY);
  return raw === 'kanban' ? 'kanban' : 'list';
}

// useSyncExternalStore reads localStorage on mount without an effect, so
// it dodges React 19's set-state-in-effect rule and stays SSR-safe.
function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener('storage', handler);
  return () => window.removeEventListener('storage', handler);
}

export function useTasksView(): {
  view: TasksView;
  setView: (v: TasksView) => void;
} {
  const view = useSyncExternalStore<TasksView>(
    subscribe,
    readStored,
    () => 'list', // server snapshot — matches initial client render before hydration
  );

  const setView = useCallback((v: TasksView) => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, v);
    // Same-tab updates don't fire `storage`, so dispatch one ourselves.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: v }));
  }, []);

  return { view, setView };
}
