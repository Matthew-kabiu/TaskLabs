import { endOfDay, endOfWeek, isAfter, isBefore, startOfDay } from 'date-fns';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'ARCHIVED' | 'BACKLOG' | 'IN_REVIEW' | 'CANCELLED';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface GroupableTask {
  id: string;
  title: string;
  dueDate: Date | null;
  status: TaskStatus;
  priority: Priority;
  position: number;
  isPrivate: boolean;
  completedAt: Date | null;
}

export interface GroupedTasks<T extends GroupableTask = GroupableTask> {
  overdue: T[];
  today: T[];
  thisWeek: T[];
  later: T[];
  noDate: T[];
}

export function groupTasksByDueBucket<T extends GroupableTask>(
  tasks: T[],
  now: Date = new Date(),
): GroupedTasks<T> {
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Monday-start week

  const groups: GroupedTasks<T> = {
    overdue: [],
    today: [],
    thisWeek: [],
    later: [],
    noDate: [],
  };

  for (const task of tasks) {
    if (!task.dueDate) {
      groups.noDate.push(task);
      continue;
    }
    const closed = task.status === 'DONE' || task.status === 'ARCHIVED' || task.status === 'CANCELLED';
    if (!closed && isBefore(task.dueDate, todayStart)) {
      groups.overdue.push(task);
      continue;
    }
    if (!isAfter(task.dueDate, todayEnd) && !isBefore(task.dueDate, todayStart)) {
      groups.today.push(task);
      continue;
    }
    if (!isAfter(task.dueDate, weekEnd)) {
      groups.thisWeek.push(task);
      continue;
    }
    groups.later.push(task);
  }

  return groups;
}
