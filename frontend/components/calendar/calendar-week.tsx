'use client';
import * as React from 'react';
import {
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { weekDays } from '@/lib/calendar/grid';
import { EventChip } from './event-chip';
import type { CalendarEventDTO } from '@/hooks/useEvents';
import type { TaskInRangeDTO } from '@/hooks/useTasksInRange';
import { cn } from '@/lib/utils';

const HOUR_PX = 56;

interface Props {
  cursor: Date;
  events: CalendarEventDTO[];
  tasks: TaskInRangeDTO[];
  onSelectEvent: (id: string) => void;
  onSelectTask: (id: string) => void;
  onEditEvent?: (id: string) => void;
  onDeleteEvent?: (id: string) => void;
  onToggleComplete?: (id: string) => void;
}

export function CalendarWeek({
  cursor,
  events,
  tasks,
  onSelectEvent,
  onSelectTask,
  onEditEvent,
  onDeleteEvent,
  onToggleComplete,
}: Props) {
  const days = weekDays(cursor);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-[3.5rem_repeat(7,1fr)] border-b">
        <div />
        {days.map((d) => {
          const isToday = isSameDay(d, new Date());
          return (
            <div key={d.toISOString()} className="px-1 py-3 md:px-2">
              <div className="text-center">
                <div
                  className={cn(
                    'text-xs font-medium md:text-sm',
                    isToday && 'text-primary',
                  )}
                >
                  {format(d, 'EEE')}
                </div>
                <div
                  className={cn(
                    'mx-auto mt-1 flex h-8 w-8 items-center justify-center rounded-full text-sm md:h-9 md:w-9 md:text-base',
                    isToday &&
                      'bg-primary text-primary-foreground font-semibold',
                  )}
                >
                  {format(d, 'd')}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex h-full overflow-auto">
          <div className="sticky left-0 z-20 w-14 shrink-0 border-r bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:w-16">
            {hours.map((h) => (
              <div
                key={h}
                data-hour-row
                style={{ height: HOUR_PX }}
                className="border-b px-2 text-right text-xs font-medium text-muted-foreground md:px-3"
              >
                {format(new Date(2026, 0, 1, h), 'HH:mm')}
              </div>
            ))}
          </div>
          <div className="grid flex-1 grid-cols-7">
            {days.map((d) => {
              const dayStart = startOfDay(d);
              const dayEvents = events.filter((e) =>
                isSameDay(parseISO(e.startAt), d),
              );
              const dayTasks = tasks.filter(
                (t) => t.dueDate && isSameDay(parseISO(t.dueDate), d),
              );
              const isToday = isSameDay(d, new Date());
              return (
                <div
                  key={d.toISOString()}
                  data-day-col
                  className={cn('relative border-r', isToday && 'bg-primary/5')}
                >
                  {hours.map((h) => (
                    <div
                      key={h}
                      style={{ height: HOUR_PX }}
                      className="border-b"
                    />
                  ))}
                  {dayEvents.map((e) => {
                    const start = parseISO(e.startAt);
                    const end = parseISO(e.endAt);
                    const top =
                      (differenceInMinutes(start, dayStart) / 60) * HOUR_PX;
                    const height = Math.max(
                      20,
                      (differenceInMinutes(end, start) / 60) * HOUR_PX,
                    );
                    return (
                      <div
                        key={e.id}
                        className="absolute inset-x-1 z-10"
                        style={{ top, height }}
                      >
                        <EventChip
                          variant="event"
                          title={e.title}
                          colorId={e.color ?? undefined}
                          timeLabel={format(start, 'HH:mm')}
                          onClick={() => onSelectEvent(e.id)}
                          onEdit={onEditEvent ? () => onEditEvent(e.id) : undefined}
                          onDelete={
                            onDeleteEvent ? () => onDeleteEvent(e.id) : undefined
                          }
                          onToggleComplete={
                            onToggleComplete
                              ? () => onToggleComplete(e.id)
                              : undefined
                          }
                          isCompleted={e.status === 'COMPLETED'}
                          className="h-full items-start shadow-sm"
                        />
                      </div>
                    );
                  })}
                  {dayTasks.map((t) => {
                    if (!t.dueDate) return null;
                    const due = parseISO(t.dueDate);
                    const top =
                      (differenceInMinutes(due, dayStart) / 60) * HOUR_PX;
                    return (
                      <div
                        key={t.id}
                        className="absolute inset-x-1 z-10"
                        style={{ top, height: 24 }}
                      >
                        <EventChip
                          variant="task"
                          title={t.title}
                          timeLabel={format(due, 'HH:mm')}
                          onClick={() => onSelectTask(t.id)}
                          className="shadow-sm"
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}