'use client';
import * as React from 'react';
import {
  differenceInMinutes,
  format,
  isSameDay,
  parseISO,
  startOfDay,
} from 'date-fns';
import { EventChip } from './event-chip';
import type { CalendarEventDTO } from '@/hooks/useEvents';
import type { TaskInRangeDTO } from '@/hooks/useTasksInRange';
import { cn } from '@/lib/utils';
import { useNow } from '@/hooks/useNow';

const HOUR_PX = 64;

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

export function CalendarDay({
  cursor,
  events,
  tasks,
  onSelectEvent,
  onSelectTask,
  onEditEvent,
  onDeleteEvent,
  onToggleComplete,
}: Props) {
  const now = useNow();
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayStart = startOfDay(cursor);
  const dayEvents = events.filter((e) =>
    isSameDay(parseISO(e.startAt), cursor),
  );
  const dayTasks = tasks.filter(
    (t) => t.dueDate && isSameDay(parseISO(t.dueDate), cursor),
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-4 md:px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-muted-foreground">
                {format(cursor, 'EEEE')}
              </span>
              <span className="text-xs text-muted-foreground">
                {format(cursor, 'MMMM yyyy')}
              </span>
            </div>
          </div>
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full text-xl font-semibold',
              now !== null && isSameDay(cursor, now)
                ? 'bg-primary text-primary-foreground'
                : '',
            )}
          >
            {format(cursor, 'd')}
          </div>
        </div>
      </div>
      <div className="relative flex-1 overflow-hidden">
        <div className="flex h-full overflow-auto">
          <div className="sticky left-0 z-20 w-14 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:w-16">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="border-b px-2 text-right text-xs font-medium text-muted-foreground md:px-3"
              >
                {format(new Date(2026, 0, 1, h), 'HH:mm')}
              </div>
            ))}
          </div>
          <div className="flex-1 relative">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_PX }}
                className="border-b border-r"
              />
            ))}
            {dayEvents.map((e) => {
              const start = parseISO(e.startAt);
              const end = parseISO(e.endAt);
              const top =
                (differenceInMinutes(start, dayStart) / 60) * HOUR_PX;
              const height = Math.max(
                24,
                (differenceInMinutes(end, start) / 60) * HOUR_PX,
              );
              return (
                <div
                  key={e.id}
                  className="absolute inset-x-0 z-10 mx-1"
                  style={{ top, height }}
                >
                  <EventChip
                    variant="event"
                    title={e.title}
                    colorId={e.color ?? undefined}
                    timeLabel={`${format(start, 'HH:mm')}–${format(end, 'HH:mm')}`}
                    onClick={() => onSelectEvent(e.id)}
                    onEdit={onEditEvent ? () => onEditEvent(e.id) : undefined}
                    onDelete={onDeleteEvent ? () => onDeleteEvent(e.id) : undefined}
                    onToggleComplete={
                      onToggleComplete ? () => onToggleComplete(e.id) : undefined
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
                  className="absolute inset-x-0 z-10 mx-1"
                  style={{ top, height: 28 }}
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
        </div>
      </div>
    </div>
  );
}