'use client';

import { useMemo } from 'react';
import {
  ListChecks,
  AlarmClock,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import {
  endOfDay,
  endOfWeek,
  isAfter,
  isBefore,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { StatCard } from '@/components/dashboard/stat-card';
import { TodayTasks } from '@/components/dashboard/today-tasks';
import { NextSevenDays } from '@/components/dashboard/next-seven-days';
import { useTasks, type TaskDTO } from '@/hooks/useTasks';
import { useWorkspaces } from '@/hooks/useWorkspaces';

function taskDate(task: TaskDTO) {
  return task.dueDate ? new Date(task.dueDate) : null;
}

export function DashboardClient() {
  const { activeWorkspaceId, activeWorkspace } = useWorkspaces();
  const tasksQuery = useTasks({ sort: 'dueDate' }, activeWorkspaceId);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const now = useMemo(() => new Date(), []);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const sevenDaysEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const todayList = tasks.filter((task) => {
    const due = taskDate(task);
    return due !== null && !isBefore(due, todayStart) && !isAfter(due, todayEnd);
  });
  const nextSeven = tasks
    .filter((task) => {
      const due = taskDate(task);
      return due !== null && !isBefore(due, todayStart) && !isAfter(due, sevenDaysEnd);
    })
    .map((task) => ({
      kind: 'task' as const,
      id: task.id,
      title: task.title,
      at: task.dueDate!,
    }));
  const stats = {
    total: tasks.length,
    dueToday: todayList.length,
    overdue: tasks.filter((task) => {
      const due = taskDate(task);
      return due !== null && task.status !== 'DONE' && isBefore(due, todayStart);
    }).length,
    doneThisWeek: tasks.filter((task) => {
      const done = task.completedAt ? new Date(task.completedAt) : null;
      return done !== null && !isBefore(done, weekStart) && !isAfter(done, weekEnd);
    }).length,
  };
  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 5 ? 'Working late' :
    greetingHour < 12 ? 'Good morning' :
    greetingHour < 18 ? 'Good afternoon' :
    'Good evening';

  return (
    <div className="mx-auto w-full max-w-7xl space-y-8 p-6 md:p-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-3xl font-semibold tracking-tight">
          {greeting}
        </h1>
        <p className="text-sm text-muted-foreground">
          {activeWorkspace?.name ?? 'Workspace'}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          <ListChecks className="h-3.5 w-3.5" />
          Tasks
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <StatCard icon={ListChecks}    label="Total"          value={stats.total} />
          <StatCard icon={AlarmClock}    label="Due Today"      value={stats.dueToday}     accent="warn" />
          <StatCard icon={AlertTriangle} label="Overdue"        value={stats.overdue}      accent="danger" />
          <StatCard icon={CheckCircle2}  label="Done This Week" value={stats.doneThisWeek} accent="good" />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TodayTasks items={todayList.map(t => ({
          id: t.id, title: t.title, priority: t.priority, status: t.status,
          dueDate: t.dueDate,
        }))} />
        <NextSevenDays items={nextSeven} />
      </section>
    </div>
  );
}
