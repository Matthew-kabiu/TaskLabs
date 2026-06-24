'use client';

import * as React from 'react';
import { format } from 'date-fns';
import {
  StickyNote,
  ExternalLink,
  CalendarDays,
  Clock,
  MapPin,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { hueToHex } from '@/lib/calendar/palette';
import type { CalendarEventDTO } from '@/hooks/useEvents';

interface Props {
  events: CalendarEventDTO[];
  monthLabel: string;
  onOpenEvent: (id: string) => void;
}

export function CalendarNotesPanel({ events, monthLabel, onOpenEvent }: Props) {
  const [open, setOpen] = React.useState(false);

  const withNotes = React.useMemo(
    () =>
      events
        .filter((e) => (e.description ?? '').trim().length > 0)
        .sort(
          (a, b) =>
            new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
        ),
    [events],
  );

  const handleOpen = (id: string) => {
    setOpen(false);
    onOpenEvent(id);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2"
          aria-label="View notes for this month"
        >
          <StickyNote className="h-4 w-4" />
          <span className="hidden sm:inline">Notes</span>
          {withNotes.length > 0 && (
            <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-foreground px-1.5 font-mono text-[10px] font-medium tabular-nums text-background">
              {withNotes.length}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 sm:max-w-md"
      >
        <SheetHeader className="border-b px-6 pb-5 pt-2">
          <SheetTitle className="flex items-center gap-2.5 text-lg">
            <StickyNote className="h-5 w-5 text-muted-foreground" />
            <span>Notes</span>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              · {monthLabel}
            </span>
          </SheetTitle>
          <SheetDescription className="text-xs">
            Notes attached to events scheduled this month.
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1">
          <div className="flex flex-col gap-3 px-6 py-5">
            {withNotes.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground">
                  <StickyNote className="h-5 w-5" />
                </span>
                <p className="max-w-[14rem] text-sm text-muted-foreground">
                  No notes yet for {monthLabel}. Add a note when creating an
                  event and it will surface here.
                </p>
              </div>
            ) : (
              withNotes.map((e) => {
                const accent = e.color ? hueToHex(e.color) : 'hsl(var(--muted-foreground))';
                const start = new Date(e.startAt);
                return (
                  <article
                    key={e.id}
                    className="group relative overflow-hidden rounded-lg border bg-card transition-colors hover:border-foreground/30"
                  >
                    <span
                      aria-hidden
                      className="absolute inset-y-0 left-0 w-1"
                      style={{ backgroundColor: accent }}
                    />
                    <div className="flex items-start justify-between gap-3 p-4 pl-5">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <h3 className="line-clamp-2 text-sm font-semibold leading-snug">
                          {e.title}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                          <span className="inline-flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" />
                            {format(start, 'EEE, MMM d')}
                          </span>
                          {!e.allDay && (
                            <span className="inline-flex items-center gap-1.5">
                              <Clock className="h-3 w-3" />
                              {format(start, 'h:mm a')}
                            </span>
                          )}
                          {e.location && (
                            <span className="inline-flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate normal-case tracking-normal">
                                {e.location}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => handleOpen(e.id)}
                        className="shrink-0 gap-1.5 px-2 text-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Open
                      </Button>
                    </div>
                    <p className="border-t bg-muted/30 px-5 py-3 text-[13px] leading-relaxed text-muted-foreground line-clamp-4 whitespace-pre-wrap">
                      {e.description}
                    </p>
                  </article>
                );
              })
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
