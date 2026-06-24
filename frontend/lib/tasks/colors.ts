import type { Priority } from '@/lib/tasks/grouping';

// Curated 8-hue palette per spec. These are CSS color values only used on
// user-data accents (priority dots, label pills, calendar chips).
export const PRIORITY_COLORS: Record<Priority, string> = {
  LOW: '#64748b',     // slate-500
  MEDIUM: '#3b82f6',  // blue-500
  HIGH: '#f59e0b',    // amber-500
  URGENT: '#ef4444',  // red-500
};

export const LABEL_PALETTE = [
  '#ef4444', // red
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#14b8a6', // teal
  '#64748b', // slate
] as const;
