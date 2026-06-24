'use client';
import * as React from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { CalendarHeader } from '@/components/calendar/calendar-header';
import { CalendarMonth } from '@/components/calendar/calendar-month';
import { CalendarWeek } from '@/components/calendar/calendar-week';
import { CalendarDay } from '@/components/calendar/calendar-day';
import { EventModal } from '@/components/calendar/event-modal';
import { rangeForView, type CalendarView } from '@/lib/calendar/grid';
import {
  useEvents,
  useDeleteEvent,
  useToggleEventComplete,
  type CalendarEventDTO,
} from '@/hooks/useEvents';
import { useTasksInRange } from '@/hooks/useTasksInRange';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfDay, isBefore } from 'date-fns';
import { CalendarNotesPanel } from '@/components/calendar/notes-panel';

export default function CalendarPage() {
  const [view, setView] = React.useState<CalendarView>('month');
  const [cursor, setCursor] = React.useState<Date>(new Date());
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<CalendarEventDTO | null>(null);
  const [defaultStart, setDefaultStart] = React.useState<Date | undefined>();

  const range = React.useMemo(() => rangeForView(view, cursor), [view, cursor]);
  const eventsQ = useEvents(range.from, range.to);
  const tasksQ = useTasksInRange(range.from, range.to);
  const deleteEvent = useDeleteEvent();
  const toggleComplete = useToggleEventComplete();

  // Deep-link: open event modal when arriving with ?event=ID (e.g. from dashboard).
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const eventIdParam = searchParams.get('event');
  React.useEffect(() => {
    if (!eventIdParam || !eventsQ.data) return;
    const found = eventsQ.data.find((e) => e.id === eventIdParam);
    if (!found) return;
    // Deep-link from URL: this is a one-shot side effect (we strip the param
    // immediately after) and is the canonical use case for setState in an
    // effect — synchronising React with an external system (the URL).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEditing(found);
    setDefaultStart(undefined);
    setModalOpen(true);
    router.replace(pathname, { scroll: false });
  }, [eventIdParam, eventsQ.data, router, pathname]);

  const navigate = (dir: 'prev' | 'next') => {
    const sign = dir === 'next' ? 1 : -1;
    if (view === 'month') setCursor((c) => addMonths(c, sign));
    else if (view === 'week') setCursor((c) => addWeeks(c, sign));
    else setCursor((c) => addDays(c, sign));
  };

  const onSelectEvent = (id: string) => {
    const found = eventsQ.data?.find((e) => e.id === id) ?? null;
    setEditing(found);
    setDefaultStart(undefined);
    setModalOpen(true);
  };
  const onSelectDate = (d: Date) => {
    if (isBefore(startOfDay(d), startOfDay(new Date()))) {
      toast.error('Cannot create events on past dates');
      return;
    }
    setEditing(null);
    setDefaultStart(d);
    setModalOpen(true);
  };
  const onSelectTask = (id: string) => {
    window.location.href = `/tasks/${id}`;
  };

  const onAddEvent = () => {
    setEditing(null);
    setDefaultStart(new Date());
    setModalOpen(true);
  };

  const onEditEvent = (id: string) => {
    const found = eventsQ.data?.find((e) => e.id === id) ?? null;
    setEditing(found);
    setDefaultStart(undefined);
    setModalOpen(true);
  };

  const onToggleComplete = async (id: string) => {
    const found = eventsQ.data?.find((e) => e.id === id);
    if (!found) return;
    const completed = found.status !== 'COMPLETED';
    try {
      await toggleComplete.mutateAsync({ id, completed });
      toast.success(completed ? 'Event marked complete' : 'Event reopened');
    } catch {
      toast.error('Failed to update event');
    }
  };

  const onDeleteEvent = async (id: string) => {
    try {
      await deleteEvent.mutateAsync(id);
      toast.success('Event deleted');
    } catch {
      toast.error('Failed to delete event');
    }
  };

  const events = eventsQ.data ?? [];
  const tasks = tasksQ.data ?? [];

  return (
    <div className="flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-2 sm:gap-4 sm:px-4 sm:py-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-4">
          <CalendarHeader
            view={view}
            cursor={cursor}
            onViewChange={setView}
            onNavigate={navigate}
            onToday={() => setCursor(new Date())}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <CalendarNotesPanel
            events={events}
            monthLabel={format(cursor, 'MMMM yyyy')}
            onOpenEvent={onSelectEvent}
          />
          <Button onClick={onAddEvent} className="shrink-0 gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 overflow-hidden bg-card">
        {view === 'month' && (
          <CalendarMonth
            cursor={cursor}
            events={events}
            tasks={tasks}
            onSelectDate={onSelectDate}
            onSelectEvent={onSelectEvent}
            onSelectTask={onSelectTask}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onToggleComplete={onToggleComplete}
          />
        )}
        {view === 'week' && (
          <CalendarWeek
            cursor={cursor}
            events={events}
            tasks={tasks}
            onSelectEvent={onSelectEvent}
            onSelectTask={onSelectTask}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onToggleComplete={onToggleComplete}
          />
        )}
        {view === 'day' && (
          <CalendarDay
            cursor={cursor}
            events={events}
            tasks={tasks}
            onSelectEvent={onSelectEvent}
            onSelectTask={onSelectTask}
            onEditEvent={onEditEvent}
            onDeleteEvent={onDeleteEvent}
            onToggleComplete={onToggleComplete}
          />
        )}
      </div>
      {modalOpen && (
        <EventModal
          key={editing?.id ?? `new-${defaultStart?.toISOString() ?? ''}`}
          open={modalOpen}
          onOpenChange={setModalOpen}
          initial={editing}
          defaultStart={defaultStart}
        />
      )}
    </div>
  );
}
