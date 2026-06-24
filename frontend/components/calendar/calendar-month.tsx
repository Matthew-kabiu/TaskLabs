'use client';
import * as React from 'react';
import { format, isBefore, isSameDay, isSameMonth, parseISO, startOfDay } from 'date-fns';
import { monthGridDays } from '@/lib/calendar/grid';
import { EventChip } from './event-chip';
import type { CalendarEventDTO } from '@/hooks/useEvents';
import type { TaskInRangeDTO } from '@/hooks/useTasksInRange';
import { cn } from '@/lib/utils';

interface Props {
  cursor: Date;
  events: CalendarEventDTO[];
  tasks: TaskInRangeDTO[];
  onSelectDate: (d: Date) => void;
  onSelectEvent: (id: string) => void;
  onSelectTask: (id: string) => void;
  onEditEvent?: (id: string) => void;
  onDeleteEvent?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
}

export function CalendarMonth({
  cursor,
  events,
  tasks,
  onSelectDate,
  onSelectEvent,
  onSelectTask,
  onEditEvent,
  onDeleteEvent,
  onToggleComplete,
}: Props) {
  const today = startOfDay(new Date());
  const days = monthGridDays(cursor);
  const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const eventsByDay = new Map<string, CalendarEventDTO[]>();
  for (const e of events) {
    const key = format(parseISO(e.startAt), 'yyyy-MM-dd');
    const arr = eventsByDay.get(key) ?? [];
    arr.push(e);
    eventsByDay.set(key, arr);
  }
  const tasksByDay = new Map<string, TaskInRangeDTO[]>();
  for (const t of tasks) {
    if (!t.dueDate) continue;
    const key = format(parseISO(t.dueDate), 'yyyy-MM-dd');
    const arr = tasksByDay.get(key) ?? [];
    arr.push(t);
    tasksByDay.set(key, arr);
  }

  return (
    <div className="flex h-full w-full flex-col">
      <div className="grid grid-cols-7 border-b px-2 py-2 sm:px-6 sm:py-4">
        {dayLabels.map((l) => (
          <div key={l} className="px-1 py-1 text-[10px] font-semibold uppercase text-muted-foreground sm:px-3 sm:py-2 sm:text-xs">
            {l}
          </div>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="grid h-full w-full grid-cols-7 grid-rows-6 gap-px bg-border">
          {days.map((d) => {
            const key = format(d, 'yyyy-MM-dd');
            const isOther = !isSameMonth(d, cursor);
            const isToday = isSameDay(d, new Date());
            const isPast = isBefore(startOfDay(d), today);
            const dayEvents = eventsByDay.get(key) ?? [];
            const dayTasks = tasksByDay.get(key) ?? [];
            return (
              <div
                key={key}
                className={cn(
                  'group flex flex-col gap-0.5 bg-card p-1 text-left text-[10px] sm:gap-1.5 sm:p-2 sm:text-xs',
                  isOther && 'bg-muted/20 text-muted-foreground',
                )}
              >
                <button
                  type="button"
                  data-day-cell="true"
                  data-past={isPast ? 'true' : undefined}
                  aria-disabled={isPast || undefined}
                  title={isPast ? 'Cannot create events on past dates' : undefined}
                  onClick={() => onSelectDate(d)}
                  className={cn(
                    'flex w-full items-center justify-between',
                    isPast ? 'cursor-default' : 'cursor-pointer',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-medium transition-colors sm:h-7 sm:w-7 sm:text-xs',
                      isToday
                        ? 'bg-primary text-primary-foreground'
                        : 'group-hover:bg-muted',
                    )}
                  >
                    {format(d, 'd')}
                  </span>
                </button>
                <div className="flex flex-col gap-0.5 overflow-hidden sm:gap-1">
                  {dayEvents.slice(0, 3).map((e) => {
                    const isOverdue = new Date(e.endAt) < new Date();
                    const isCompleted = e.status === 'COMPLETED';
                    return (
                      <EventChip
                        key={e.id}
                        variant="event"
                        colorId={e.color ?? undefined}
                        title={e.title}
                        onClick={() => onSelectEvent(e.id)}
                        onEdit={onEditEvent ? () => onEditEvent(e.id) : undefined}
                        onDelete={onDeleteEvent ? () => onDeleteEvent(e.id) : undefined}
                        onToggleComplete={
                          onToggleComplete ? () => onToggleComplete(e.id) : undefined
                        }
                        isOverdue={isOverdue}
                        isCompleted={isCompleted}
                        className="h-5 text-[9px] sm:h-6 sm:text-xs"
                      />
                    );
                  })}
                  {dayTasks.slice(0, 2).map((t) => (
                    <EventChip
                      key={t.id}
                      variant="task"
                      title={t.title}
                      onClick={() => onSelectTask(t.id)}
                      className="h-5 text-[9px] sm:h-6 sm:text-xs"
                    />
                  ))}
                  {dayEvents.length + dayTasks.length > 5 && (
                    <span className="px-1 py-0.5 text-[8px] font-medium text-muted-foreground sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                      +{dayEvents.length + dayTasks.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
