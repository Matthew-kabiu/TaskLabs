'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ListChecks,
  AlarmClock,
  ArrowRight,
  AlertTriangle,
  BadgeCheck,
  Clock3,
  CheckCircle2,
  FolderKanban,
  Map,
  Rocket,
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
import { useProjects } from '@/hooks/useProjects';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { ROUTES } from '@/lib/routes';
import { useNow } from '@/hooks/useNow';

function taskDate(task: TaskDTO) {
  return task.dueDate ? new Date(task.dueDate) : null;
}

export function DashboardClient({ timeZone }: { timeZone: string }) {
  const { activeWorkspaceId, activeWorkspace } = useWorkspaces();
  const tasksQuery = useTasks({ sort: 'dueDate' }, activeWorkspaceId);
  const projectsQuery = useProjects({}, activeWorkspaceId);
  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const projects = useMemo(
    () => projectsQuery.data ?? [],
    [projectsQuery.data],
  );
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
  // Single traversal: the filter predicate and projection are fused.
  const nextSeven = tasks.flatMap((task) => {
    const due = taskDate(task);
    if (due === null || isBefore(due, todayStart) || isAfter(due, sevenDaysEnd)) {
      return [];
    }
    return [
      {
        kind: 'task' as const,
        id: task.id,
        title: task.title,
        at: task.dueDate!,
      },
    ];
  });
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
  const projectStats = {
    total: projects.length,
    planning: projects.filter((project) => project.status === 'PLANNING').length,
    inProgress: projects.filter((project) => project.status === 'IN_PROGRESS').length,
    completed: projects.filter((project) => project.status === 'COMPLETED').length,
  };
  const clock = useNow(1_000);
  const greetingHour = clock
    ? Number(
        new Intl.DateTimeFormat('en-US', {
          hour: '2-digit',
          hour12: false,
          timeZone,
        }).formatToParts(clock).find((part) => part.type === 'hour')?.value ?? 12,
      )
    : 12;
  const greeting =
    greetingHour < 5 ? 'Working late' :
    greetingHour < 12 ? 'Good morning' :
    greetingHour < 18 ? 'Good afternoon' :
    'Good evening';

  return (
    <div className="w-full space-y-8 p-6">
      <header className="flex flex-col gap-4 border-b border-border/50 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {activeWorkspace?.name ?? 'Workspace'}
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">{greeting}</h1>
          <p className="text-sm text-muted-foreground">Here is what needs your attention.</p>
        </div>
        <div className="flex min-w-52 items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
            <Clock3 className="h-4 w-4" />
          </span>
          <div>
            <time className="block font-mono text-lg font-semibold tabular-nums" suppressHydrationWarning>
              {clock
                ? new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                    timeZone,
                  }).format(clock)
                : '--:--:--'}
            </time>
            <p className="text-[11px] text-muted-foreground">{timeZone}</p>
          </div>
        </div>
      </header>

      <section className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-foreground/10 ring-1 ring-foreground/15">
                <ListChecks className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Tasks</h2>
                <p className="text-xs text-muted-foreground">Work requiring attention</p>
              </div>
            </div>
            <Link href={ROUTES.app.tasks} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <StatCard icon={ListChecks} label="Total" value={stats.total} href={ROUTES.app.tasks} />
            <StatCard icon={AlarmClock} label="Due Today" value={stats.dueToday} href={ROUTES.app.tasksView('today')} accent="warn" />
            <StatCard icon={AlertTriangle} label="Overdue" value={stats.overdue} href={ROUTES.app.tasksView('overdue')} accent="danger" />
            <StatCard icon={CheckCircle2} label="Done This Week" value={stats.doneThisWeek} href={ROUTES.app.tasksView('done-this-week')} accent="good" />
          </div>
        </div>

        <div className="space-y-4 rounded-xl border border-border/50 bg-card/30 p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
                <FolderKanban className="h-4 w-4" />
              </span>
              <div>
                <h2 className="text-sm font-semibold">Projects</h2>
                <p className="text-xs text-muted-foreground">Initiatives across the workspace</p>
              </div>
            </div>
            <Link href={ROUTES.app.projects} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <StatCard icon={FolderKanban} label="Total Projects" value={projectStats.total} href={ROUTES.app.projects} />
            <StatCard icon={Map} label="Planning" value={projectStats.planning} href={ROUTES.app.projectsStatus('PLANNING')} accent="info" />
            <StatCard icon={Rocket} label="In Progress" value={projectStats.inProgress} href={ROUTES.app.projectsStatus('IN_PROGRESS')} accent="warn" />
            <StatCard icon={BadgeCheck} label="Completed" value={projectStats.completed} href={ROUTES.app.projectsStatus('COMPLETED')} accent="good" />
          </div>
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
