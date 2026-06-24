'use client';
import * as React from 'react';
import { format } from 'date-fns';
import { ChevronLeft, ChevronRight, CalendarCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { CalendarView } from '@/lib/calendar/grid';

interface Props {
  view: CalendarView;
  cursor: Date;
  onViewChange: (v: CalendarView) => void;
  onNavigate: (dir: 'prev' | 'next') => void;
  onToday: () => void;
}

function rangeLabel(view: CalendarView, cursor: Date): string {
  if (view === 'month') return format(cursor, 'MMMM yyyy');
  if (view === 'week') return `Week of ${format(cursor, 'MMM d, yyyy')}`;
  return format(cursor, 'EEEE, MMM d, yyyy');
}

export function CalendarHeader({
  view,
  cursor,
  onViewChange,
  onNavigate,
  onToday,
}: Props) {
  return (
    <div className="flex w-full items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous"
            onClick={() => onNavigate('prev')}
            className="h-9 w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next"
            onClick={() => onNavigate('next')}
            className="h-9 w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onToday}
          className="h-9 gap-2"
        >
          <CalendarCheck className="h-4 w-4" />
          Today
        </Button>
        <span className="ml-2 text-base font-semibold">
          {rangeLabel(view, cursor)}
        </span>
      </div>
      <Tabs
        value={view}
        onValueChange={(v) => onViewChange(v as CalendarView)}
        className="rounded-lg bg-muted p-1"
      >
        <TabsList className="bg-transparent">
          <TabsTrigger value="month" className="data-[state=active]:bg-background">Month</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-background">Week</TabsTrigger>
          <TabsTrigger value="day" className="data-[state=active]:bg-background">Day</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
