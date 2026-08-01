'use client';
import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Save,
  Trash2,
  X,
  Lock,
  Type,
  StickyNote,
  Palette,
  MapPin,
  EyeOff,
  Repeat,
  Sun,
  PlayCircle,
  StopCircle,
  CalendarPlus,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DateTimePicker } from '@/components/ui/datetime-picker';
import { useNow } from '@/hooks/useNow';
import {
  applyScheduleConstraints,
  scheduleChanged,
} from '@/lib/calendar/schedule-constraints';
import { toast } from 'sonner';
import { eventCreateSchema } from '@/lib/validations/event.schema';
import { EVENT_HUES, hueToHex } from '@/lib/calendar/palette';
import {
  buildRrule,
  parseRrule,
  type RruleFreq,
} from '@/lib/calendar/rrule-builder';
import {
  useCreateEvent,
  useUpdateEvent,
  useDeleteEvent,
  type CalendarEventDTO,
} from '@/hooks/useEvents';
import { z } from 'zod';

const formSchema = z.object({
  title: z.string().min(1),
  notes: z.string().optional(),
  allDay: z.boolean(),
  color: z.string().optional(),
  location: z.string().optional(),
  isPrivate: z.boolean(),
  freq: z.enum(['NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
});
type FormValues = z.infer<typeof formSchema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: CalendarEventDTO | null;
  defaultStart?: Date;
}

export function EventModal({
  open,
  onOpenChange,
  initial,
  defaultStart,
}: Props) {
  const create = useCreateEvent();
  const update = useUpdateEvent();
  const del = useDeleteEvent();
  const isEdit = !!initial;

  const now = useNow(30_000);

  const baseStart = initial
    ? new Date(initial.startAt)
    : defaultStart ?? new Date();
  const baseEnd = initial
    ? new Date(initial.endAt)
    : new Date(baseStart.getTime() + 60 * 60 * 1000);

  const [startAt, setStartAt] = React.useState<Date>(baseStart);
  const [endAt, setEndAt] = React.useState<Date>(baseEnd);

  // For NEW events we forbid past dates/times; for editing we let the user
  // keep the existing schedule (so historical events can be amended).
  // `now` is null until hydration, which simply means no lower bound yet.
  const startMin = isEdit ? undefined : now ?? undefined;

  // Both scheduling constraints are enforced in a single pass, during render,
  // instead of two chained effects that each triggered another commit (the
  // first effect's `setStartAt` re-ran the second one). The corrected values
  // are therefore used by the very first paint. State is only written when a
  // bound actually moved, so the user's own edits win and there is no loop.
  const corrected = applyScheduleConstraints({ startAt, endAt }, { now, isEdit });
  if (scheduleChanged({ startAt, endAt }, corrected)) {
    setStartAt(corrected.startAt);
    setEndAt(corrected.endAt);
  }

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: initial?.title ?? '',
      notes: initial?.description ?? '',
      allDay: initial?.allDay ?? false,
      color: initial?.color ?? 'slate',
      location: initial?.location ?? '',
      isPrivate: initial?.isPrivate ?? false,
      freq: parseRrule(initial?.rrule).freq,
    },
  });

  // useWatch is the React-Compiler-compatible way to subscribe to form fields.
  // form.watch() returns a fresh function on every render which can't be
  // memoized safely, triggering react-hooks/incompatible-library.
  const watched = useWatch({ control: form.control });
  const selectedColor = watched.color ?? 'slate';
  const watchedAllDay = watched.allDay ?? false;
  const watchedIsPrivate = watched.isPrivate ?? false;
  const watchedFreq = watched.freq;

  const isOverdue = initial && initial.endAt ? new Date(initial.endAt) < new Date() : false;
  const canUpdate = !isOverdue;

  const onSubmit = form.handleSubmit(async (values) => {
    // Submit handler fires on user event, not during render — Date.now() is
    // safe here despite the React Compiler purity flag.
    // eslint-disable-next-line react-hooks/purity
    if (!isEdit && startAt.getTime() < Date.now()) {
      toast.error('Start must be in the future.');
      return;
    }
    if (endAt.getTime() <= startAt.getTime()) {
      toast.error('End must be after start.');
      return;
    }
    const payload = eventCreateSchema.parse({
      title: values.title,
      description: values.notes || null,
      startAt: startAt.toISOString(),
      endAt: endAt.toISOString(),
      allDay: values.allDay,
      color: values.color || null,
      location: values.location || null,
      isPrivate: values.isPrivate,
      rrule: buildRrule({ freq: values.freq as RruleFreq }),
    });
    if (isEdit && initial) {
      await update.mutateAsync({ id: initial.id, data: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5 text-muted-foreground" />
            {isEdit ? 'Edit event' : 'New event'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title" className="flex items-center gap-1.5 text-xs">
              <Type className="h-3.5 w-3.5 text-muted-foreground" />
              Title
            </Label>
            <Input id="title" placeholder="Event title" {...form.register('title')} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="flex items-center gap-1.5 text-xs">
              <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
              Notes
            </Label>
            <Textarea
              id="notes"
              rows={4}
              placeholder="Add details, agenda, links…"
              {...form.register('notes')}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <PlayCircle className="h-3.5 w-3.5 text-muted-foreground" />
                Start
              </Label>
              <DateTimePicker
                value={startAt}
                onChange={setStartAt}
                min={startMin}
                ariaLabel="Start"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs">
                <StopCircle className="h-3.5 w-3.5 text-muted-foreground" />
                End
              </Label>
              <DateTimePicker
                value={endAt}
                onChange={setEndAt}
                min={startAt}
                ariaLabel="End"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="allDay"
              checked={watchedAllDay}
              onCheckedChange={(v) =>
                form.setValue('allDay', v, { shouldDirty: true, shouldTouch: true })
              }
            />
            <Label htmlFor="allDay" className="flex items-center gap-1.5 text-sm">
              <Sun className="h-3.5 w-3.5 text-muted-foreground" />
              All day
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Palette className="h-3.5 w-3.5 text-muted-foreground" />
              Color
            </Label>
            <div className="flex gap-2">
              {EVENT_HUES.map((h) => {
                const sel = selectedColor === h.id;
                return (
                  <button
                    key={h.id}
                    type="button"
                    aria-label={h.label}
                    aria-pressed={sel}
                    onClick={() =>
                      form.setValue('color', h.id, {
                        shouldDirty: true,
                        shouldTouch: true,
                      })
                    }
                    className={
                      'h-6 w-6 rounded-full border transition-shadow ' +
                      (sel
                        ? 'ring-2 ring-foreground ring-offset-2 ring-offset-background'
                        : '')
                    }
                    style={{ backgroundColor: hueToHex(h.id) }}
                  />
                );
              })}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="location" className="flex items-center gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
              Location
            </Label>
            <Input id="location" placeholder="Optional" {...form.register('location')} />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="isPrivate"
              checked={watchedIsPrivate}
              onCheckedChange={(v) =>
                form.setValue('isPrivate', v, { shouldDirty: true, shouldTouch: true })
              }
            />
            <Label htmlFor="isPrivate" className="flex items-center gap-1.5 text-sm">
              <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
              Private (only me)
            </Label>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs">
              <Repeat className="h-3.5 w-3.5 text-muted-foreground" />
              Repeats
            </Label>
            <Select
              value={watchedFreq}
              onValueChange={(v) =>
                form.setValue('freq', v as RruleFreq, {
                  shouldDirty: true,
                  shouldTouch: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NONE">Does not repeat</SelectItem>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="flex justify-between">
            {isEdit && initial && (
              <Button
                type="button"
                variant="destructive"
                className="gap-2"
                onClick={async () => {
                  await del.mutateAsync(initial.id);
                  onOpenChange(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </Button>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="gap-2"
                onClick={() => onOpenChange(false)}
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={form.formState.isSubmitting || !canUpdate}
                className="gap-2"
              >
                {!canUpdate && isEdit ? (
                  <>
                    <Lock className="h-4 w-4" />
                    Cannot update
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
