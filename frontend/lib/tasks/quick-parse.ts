export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface QuickAddResult {
  title: string;
  priority?: Priority;
  dueDate?: Date;
}

const PRIORITY_TOKENS: Record<string, Priority> = {
  low: 'LOW',
  med: 'MEDIUM',
  medium: 'MEDIUM',
  high: 'HIGH',
  urgent: 'URGENT',
};

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

/** Returns midnight UTC for the given date's UTC calendar day. */
function utcStartOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function nextWeekday(from: Date, target: number): Date {
  const base = utcStartOfDay(from);
  const cur = base.getUTCDay();
  let diff = (target - cur + 7) % 7;
  if (diff === 0) diff = 7;
  return new Date(base.getTime() + diff * 86_400_000);
}

export function parseQuickAdd(input: string, now: Date = new Date()): QuickAddResult {
  let priority: Priority | undefined;
  let dueDate: Date | undefined;

  const tokens = input.split(/\s+/).filter(Boolean);
  const remaining: string[] = [];

  for (const tok of tokens) {
    const lower = tok.toLowerCase();
    if (lower.startsWith('!')) {
      const key = lower.slice(1);
      if (PRIORITY_TOKENS[key]) {
        priority = PRIORITY_TOKENS[key];
        continue;
      }
      remaining.push(tok);
      continue;
    }
    if (!dueDate) {
      if (lower === 'today') {
        dueDate = utcStartOfDay(now);
        continue;
      }
      if (lower === 'tomorrow') {
        const base = utcStartOfDay(now);
        dueDate = new Date(base.getTime() + 86_400_000);
        continue;
      }
      const wd = WEEKDAYS.indexOf(lower as (typeof WEEKDAYS)[number]);
      if (wd !== -1) {
        dueDate = nextWeekday(now, wd);
        continue;
      }
    }
    remaining.push(tok);
  }

  return {
    title: remaining.join(' ').trim(),
    priority,
    dueDate,
  };
}
