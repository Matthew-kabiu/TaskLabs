'use client';

import * as React from 'react';
import { format, isSameDay, startOfDay } from 'date-fns';
import { CalendarIcon, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export function useNow(intervalMs = 30_000) {
  const [now, setNow] = React.useState<Date>(() => new Date());
  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

interface DateTimePickerProps {
  value: Date;
  onChange: (date: Date) => void;
  /** Earliest allowed date-time. Past dates and earlier times are disabled. */
  min?: Date;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES_5 = Array.from({ length: 12 }, (_, i) => i * 5);

function to24(hour12: number, isPM: boolean): number {
  if (isPM) return hour12 === 12 ? 12 : hour12 + 12;
  return hour12 === 12 ? 0 : hour12;
}

export function DateTimePicker({
  value,
  onChange,
  min,
  className,
  disabled,
  ariaLabel,
}: DateTimePickerProps) {
  const [dateOpen, setDateOpen] = React.useState(false);
  const [timeOpen, setTimeOpen] = React.useState(false);

  const minDay = min ? startOfDay(min) : undefined;
  const isOnMinDay = min ? isSameDay(value, min) : false;

  const setDate = (d: Date) => {
    const next = new Date(d);
    next.setHours(value.getHours(), value.getMinutes(), 0, 0);
    if (min && next.getTime() < min.getTime()) {
      // snap forward to the minimum allowed time on that day
      next.setHours(min.getHours(), min.getMinutes(), 0, 0);
    }
    onChange(next);
  };

  const setTime = (h24: number, m: number) => {
    const next = new Date(value);
    next.setHours(h24, m, 0, 0);
    if (min && next.getTime() < min.getTime()) return;
    onChange(next);
  };

  const isPM = value.getHours() >= 12;
  const hour12 = ((value.getHours() + 11) % 12) + 1;
  const minuteRoundedDown = value.getMinutes() - (value.getMinutes() % 5);

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-col gap-2', className)}
    >
      {/* DATE */}
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-10 justify-start gap-2 font-normal"
          >
            <CalendarIcon className="h-4 w-4 opacity-70" />
            <span className="truncate">{format(value, 'EEE, MMM d, yyyy')}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto overflow-hidden p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(d) => {
              if (d) {
                setDate(d);
                setDateOpen(false);
              }
            }}
            disabled={minDay ? { before: minDay } : undefined}
            autoFocus
            captionLayout="dropdown"
            className="[--cell-size:2.25rem] p-3"
            classNames={{
              weekdays: 'flex w-full justify-between mb-1',
              weekday:
                'text-muted-foreground/80 flex-1 select-none text-center text-[11px] font-medium uppercase tracking-wider',
              week: 'mt-1 flex w-full justify-between',
              day: 'group/day relative aspect-square h-[--cell-size] w-[--cell-size] select-none p-0 text-center',
              today:
                'bg-accent text-accent-foreground rounded-md font-semibold data-[selected=true]:rounded-md',
            }}
          />
        </PopoverContent>
      </Popover>

      {/* TIME */}
      <Popover open={timeOpen} onOpenChange={setTimeOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="h-10 justify-start gap-2 font-mono text-sm font-normal tabular-nums"
          >
            <Clock className="h-4 w-4 opacity-70" />
            {format(value, 'h:mm a')}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-2">
          <div className="flex items-stretch gap-1.5">
            <TimeColumn label="hr">
              {HOURS_12.map((h) => {
                const h24 = to24(h, isPM);
                const dis =
                  !!min &&
                  isOnMinDay &&
                  // can't pick an hour earlier than minimum
                  (h24 < min.getHours() ||
                    (h24 === min.getHours() &&
                      value.getMinutes() < min.getMinutes()));
                return (
                  <TimeButton
                    key={h}
                    selected={h === hour12}
                    disabled={dis}
                    onClick={() => setTime(h24, value.getMinutes())}
                  >
                    {String(h).padStart(2, '0')}
                  </TimeButton>
                );
              })}
            </TimeColumn>
            <TimeColumn label="min">
              {MINUTES_5.map((m) => {
                const dis =
                  !!min &&
                  isOnMinDay &&
                  value.getHours() === min.getHours() &&
                  m < min.getMinutes();
                return (
                  <TimeButton
                    key={m}
                    selected={m === minuteRoundedDown}
                    disabled={dis}
                    onClick={() => setTime(value.getHours(), m)}
                  >
                    {String(m).padStart(2, '0')}
                  </TimeButton>
                );
              })}
            </TimeColumn>
            <TimeColumn label="">
              {(['AM', 'PM'] as const).map((p) => {
                const targetIsPM = p === 'PM';
                const h24 = to24(hour12, targetIsPM);
                const dis = !!min && isOnMinDay && h24 < min.getHours();
                return (
                  <TimeButton
                    key={p}
                    selected={targetIsPM === isPM}
                    disabled={dis}
                    onClick={() => setTime(h24, value.getMinutes())}
                  >
                    {p}
                  </TimeButton>
                );
              })}
            </TimeColumn>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TimeColumn({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-stretch">
      {label ? (
        <div className="mb-1 px-1 font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground/70">
          {label}
        </div>
      ) : (
        <div className="mb-1 h-3" />
      )}
      <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto pr-1 [scrollbar-width:thin]">
        {children}
      </div>
    </div>
  );
}

function TimeButton({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-7 w-12 rounded-md font-mono text-xs tabular-nums transition-colors',
        selected
          ? 'bg-primary text-primary-foreground'
          : 'text-foreground hover:bg-accent',
        disabled && 'cursor-not-allowed opacity-30 hover:bg-transparent',
      )}
    >
      {children}
    </button>
  );
}
