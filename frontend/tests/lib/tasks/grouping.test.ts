import { describe, expect, it } from 'vitest';
import { groupTasksByDueBucket, type GroupedTasks } from '@/lib/tasks/grouping';

const NOW = new Date('2026-04-28T12:00:00Z'); // Tue
const day = (iso: string) => new Date(iso);

const t = (id: string, dueDate: Date | null) => ({
  id,
  title: id,
  dueDate,
  status: 'TODO' as const,
  priority: 'MEDIUM' as const,
  position: 0,
  isPrivate: false,
  completedAt: null,
});

describe('groupTasksByDueBucket', () => {
  it('places tasks in correct buckets', () => {
    const tasks = [
      t('overdue', day('2026-04-27T10:00:00Z')),
      t('today', day('2026-04-28T20:00:00Z')),
      t('thisWeek', day('2026-04-30T10:00:00Z')),
      t('later', day('2026-05-15T10:00:00Z')),
      t('none', null),
    ];
    const g: GroupedTasks = groupTasksByDueBucket(tasks, NOW);
    expect(g.overdue.map((x) => x.id)).toEqual(['overdue']);
    expect(g.today.map((x) => x.id)).toEqual(['today']);
    expect(g.thisWeek.map((x) => x.id)).toEqual(['thisWeek']);
    expect(g.later.map((x) => x.id)).toEqual(['later']);
    expect(g.noDate.map((x) => x.id)).toEqual(['none']);
  });

  it('treats DONE/ARCHIVED as not overdue even with past dueDate', () => {
    const done = { ...t('done', day('2026-04-01T10:00:00Z')), status: 'DONE' as const };
    const g = groupTasksByDueBucket([done], NOW);
    expect(g.overdue).toEqual([]);
    expect(g.later.length + g.thisWeek.length + g.today.length + g.noDate.length).toBe(1);
  });
});
