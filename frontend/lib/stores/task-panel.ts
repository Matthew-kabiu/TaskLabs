'use client';

import { useSyncExternalStore } from 'react';

interface TaskPanelState {
  taskId: string | null;
  open: (id: string) => void;
  close: () => void;
}

type Listener = () => void;

// Module-level store — mimics the zustand API without the dependency.
let state: TaskPanelState = {
  taskId: null,
  open,
  close,
};

const listeners = new Set<Listener>();

function notify() {
  for (const l of listeners) l();
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot(): TaskPanelState {
  return state;
}

function open(id: string) {
  state = { ...state, taskId: id };
  notify();
}

function close() {
  state = { ...state, taskId: null };
  notify();
}

// Re-assign so initial `open` / `close` refs point to the functions above.
state = { taskId: null, open, close };

/**
 * Zustand-compatible selector hook for the task panel.
 *
 * Usage:
 *   const open = useTaskPanel((s) => s.open);
 *   const taskId = useTaskPanel((s) => s.taskId);
 */
export function useTaskPanel<T>(selector: (s: TaskPanelState) => T): T {
  const get = () => selector(getSnapshot());
  return useSyncExternalStore(subscribe, get, get);
}
