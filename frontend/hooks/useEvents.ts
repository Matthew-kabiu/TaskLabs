'use client';

import { useCallback, useMemo } from 'react';
import {
  useMutation as useConvexMutation,
  useQuery,
} from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import type {
  EventCreateInput,
  EventUpdateInput,
} from '@/lib/validations/event.schema';
import { usePendingMutation } from '@/hooks/usePendingMutation';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { BACKEND_ROUTES } from '@/lib/routes';

export interface CalendarEventDTO {
  id: string;
  workspaceId: string;
  creatorId: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string | null;
  location: string | null;
  isPrivate: boolean;
  rrule: string | null;
  status?: 'SCHEDULED' | 'COMPLETED' | 'CANCELLED';
  completedAt?: string | null;
  occurrenceStart?: string;
  createdAt?: string;
  updatedAt?: string;
}

type EventsQueryResult = {
  data: CalendarEventDTO[] | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
};

function dateArg(value: Date | string | number | null | undefined) {
  if (value instanceof Date) return value.toISOString();
  return value;
}

function createArgs(workspaceId: string, input: EventCreateInput) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    title: input.title,
    description: input.description ?? undefined,
    startAt: dateArg(input.startAt),
    endAt: dateArg(input.endAt),
    allDay: input.allDay,
    color: input.color ?? undefined,
    location: input.location ?? undefined,
    isPrivate: input.isPrivate,
    rrule: input.rrule ?? undefined,
  };
}

function updateArgs(
  workspaceId: string,
  eventId: string,
  input: EventUpdateInput,
) {
  return {
    workspaceId: workspaceId as Id<'workspaces'>,
    eventId: eventId as Id<'calendarEvents'>,
    title: input.title,
    description: input.description,
    startAt: dateArg(input.startAt),
    endAt: dateArg(input.endAt),
    allDay: input.allDay,
    color: input.color,
    location: input.location,
    isPrivate: input.isPrivate,
    rrule: input.rrule,
  };
}

export function useEvents(from: Date, to: Date): EventsQueryResult {
  const { activeWorkspaceId } = useWorkspaces();
  const args = useMemo(
    () =>
      activeWorkspaceId
        ? {
            workspaceId: activeWorkspaceId as Id<'workspaces'>,
            from: from.toISOString(),
            to: to.toISOString(),
          }
        : 'skip',
    [activeWorkspaceId, from, to],
  );
  const data = useQuery(BACKEND_ROUTES.events.list, args) as
    | CalendarEventDTO[]
    | undefined;

  return {
    data,
    isLoading: Boolean(activeWorkspaceId) && data === undefined,
    isError: false,
    error: null,
  };
}

export function useCreateEvent() {
  const { activeWorkspaceId } = useWorkspaces();
  const createEvent = useConvexMutation(BACKEND_ROUTES.events.create);
  return usePendingMutation<CalendarEventDTO, EventCreateInput>(
    useCallback(
      async (input) => {
        if (!activeWorkspaceId) {
          throw new Error('Select a workspace before creating events.');
        }
        return (await createEvent(
          createArgs(activeWorkspaceId, input) as Parameters<typeof createEvent>[0],
        )) as CalendarEventDTO;
      },
      [activeWorkspaceId, createEvent],
    ),
  );
}

export function useUpdateEvent() {
  const { activeWorkspaceId } = useWorkspaces();
  const updateEvent = useConvexMutation(BACKEND_ROUTES.events.update);
  return usePendingMutation<
    CalendarEventDTO,
    { id: string; data: EventUpdateInput }
  >(
    useCallback(
      async ({ id, data }) => {
        if (!activeWorkspaceId) {
          throw new Error('Select a workspace before updating events.');
        }
        return (await updateEvent(
          updateArgs(activeWorkspaceId, id, data) as Parameters<typeof updateEvent>[0],
        )) as CalendarEventDTO;
      },
      [activeWorkspaceId, updateEvent],
    ),
  );
}

export function useToggleEventComplete() {
  const { activeWorkspaceId } = useWorkspaces();
  const completeEvent = useConvexMutation(BACKEND_ROUTES.events.complete);
  return usePendingMutation<CalendarEventDTO, { id: string; completed: boolean }>(
    useCallback(
      async ({ id, completed }) => {
        if (!activeWorkspaceId) {
          throw new Error('Select a workspace before updating events.');
        }
        return (await completeEvent({
          workspaceId: activeWorkspaceId as Id<'workspaces'>,
          eventId: id as Id<'calendarEvents'>,
          completed,
        })) as CalendarEventDTO;
      },
      [activeWorkspaceId, completeEvent],
    ),
  );
}

export function useDeleteEvent() {
  const { activeWorkspaceId } = useWorkspaces();
  const removeEvent = useConvexMutation(BACKEND_ROUTES.events.remove);
  return usePendingMutation<void, string>(
    useCallback(
      async (id) => {
        if (!activeWorkspaceId) {
          throw new Error('Select a workspace before deleting events.');
        }
        await removeEvent({
          workspaceId: activeWorkspaceId as Id<'workspaces'>,
          eventId: id as Id<'calendarEvents'>,
        });
      },
      [activeWorkspaceId, removeEvent],
    ),
  );
}
