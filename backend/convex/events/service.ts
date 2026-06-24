import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership, requireMembershipForUser } from "../lib/auth";
import { createNotificationRecord } from "../notifications/model";
import {
  assertEventRange,
  canReadEvent,
  eventDto,
  expandEventOccurrences,
  getEventInWorkspace,
  listEventRecords,
  normalizeEventColor,
  normalizeEventTitle,
  normalizeNullableText,
  normalizeRrule,
  parseOptionalTime,
  parseTime,
  type EventStatus,
} from "./model";

export type CreateEventInput = {
  title: string;
  description?: string | null;
  startAt: number | string;
  endAt: number | string;
  allDay?: boolean;
  color?: string | null;
  location?: string | null;
  isPrivate?: boolean;
  rrule?: string | null;
};

export type UpdateEventInput = {
  title?: string;
  description?: string | null;
  startAt?: number | string;
  endAt?: number | string;
  allDay?: boolean;
  color?: string | null;
  location?: string | null;
  isPrivate?: boolean;
  rrule?: string | null;
  status?: EventStatus;
  completedAt?: number | string | null;
};

export async function listEvents(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  input: { from: number | string; to: number | string },
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await listEventsForActor(ctx, workspaceId, userId, input, true);
}

export async function listEventsForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  input: { from: number | string; to: number | string },
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const from = parseTime(input.from);
  const to = parseTime(input.to);
  if (to <= from) {
    throw new Error("to must be after from");
  }

  const rows = (await listEventRecords(ctx, workspaceId)).filter((event) =>
    canReadEvent(event, userId),
  );
  return rows
    .flatMap((event) =>
      expandEventOccurrences(event, from, to).map((occurrence) =>
        eventDto(event, occurrence),
      ),
    )
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

export async function getEvent(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"calendarEvents">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await getEventForActor(ctx, workspaceId, userId, eventId, true);
}

export async function getEventForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  eventId: Id<"calendarEvents">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const event = await getEventInWorkspace(ctx, workspaceId, eventId);
  if (!canReadEvent(event, userId)) {
    throw new Error("Event not found");
  }
  return eventDto(event);
}

export async function createEvent(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  input: CreateEventInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await createEventForActor(ctx, workspaceId, userId, input, true);
}

export async function createEventForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  input: CreateEventInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const startAt = parseTime(input.startAt);
  const endAt = parseTime(input.endAt);
  assertEventRange(startAt, endAt);
  const now = Date.now();
  const eventId = await ctx.db.insert("calendarEvents", {
    workspaceId,
    creatorId: userId,
    title: normalizeEventTitle(input.title),
    description: normalizeNullableText(input.description, 5000, "Description"),
    startAt,
    endAt,
    allDay: input.allDay ?? false,
    color: normalizeEventColor(input.color),
    location: normalizeNullableText(input.location, 200, "Location"),
    isPrivate: input.isPrivate ?? false,
    rrule: normalizeRrule(input.rrule),
    status: "SCHEDULED",
    createdAt: now,
    updatedAt: now,
  });
  const event = await ctx.db.get(eventId);
  if (event === null) {
    throw new Error("Event not found after create");
  }
  return eventDto(event);
}

export async function updateEvent(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"calendarEvents">,
  input: UpdateEventInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await updateEventForActor(ctx, workspaceId, userId, eventId, input, true);
}

export async function updateEventForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  eventId: Id<"calendarEvents">,
  input: UpdateEventInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const existing = await getEventInWorkspace(ctx, workspaceId, eventId);
  if (existing.isPrivate && existing.creatorId !== userId) {
    throw new Error("Event not found");
  }

  const patch: Partial<typeof existing> = { updatedAt: Date.now() };
  if (input.title !== undefined) patch.title = normalizeEventTitle(input.title);
  if (input.description !== undefined) {
    patch.description = normalizeNullableText(input.description, 5000, "Description");
  }
  if (input.startAt !== undefined) patch.startAt = parseTime(input.startAt);
  if (input.endAt !== undefined) patch.endAt = parseTime(input.endAt);
  if (input.allDay !== undefined) patch.allDay = input.allDay;
  if (input.color !== undefined) patch.color = normalizeEventColor(input.color);
  if (input.location !== undefined) {
    patch.location = normalizeNullableText(input.location, 200, "Location");
  }
  if (input.isPrivate !== undefined) patch.isPrivate = input.isPrivate;
  if (input.rrule !== undefined) patch.rrule = normalizeRrule(input.rrule);
  if (input.status !== undefined) patch.status = input.status;
  if (input.completedAt !== undefined) {
    patch.completedAt = parseOptionalTime(input.completedAt);
  }

  assertEventRange(patch.startAt ?? existing.startAt, patch.endAt ?? existing.endAt);
  await ctx.db.patch(eventId, patch);
  const event = await ctx.db.get(eventId);
  if (event === null) {
    throw new Error("Event not found after update");
  }
  return eventDto(event);
}

export async function setEventCompletion(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"calendarEvents">,
  completed: boolean,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await setEventCompletionForActor(
    ctx,
    workspaceId,
    userId,
    eventId,
    completed,
    true,
  );
}

export async function setEventCompletionForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  eventId: Id<"calendarEvents">,
  completed: boolean,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const existing = await getEventInWorkspace(ctx, workspaceId, eventId);
  if (existing.isPrivate && existing.creatorId !== userId) {
    throw new Error("Event not found");
  }
  const now = Date.now();
  await ctx.db.patch(eventId, {
    status: completed ? "COMPLETED" : "SCHEDULED",
    completedAt: completed ? now : undefined,
    updatedAt: now,
  });
  await createNotificationRecord(ctx, {
    userId,
    type: "EVENT_COMPLETED",
    payload: {
      eventId,
      title: existing.title,
      actorId: userId,
      workspaceId,
      reopened: !completed,
    },
    now,
  });
  const event = await ctx.db.get(eventId);
  if (event === null) {
    throw new Error("Event not found after completion update");
  }
  return eventDto(event);
}

export async function removeEvent(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"calendarEvents">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeEventForActor(ctx, workspaceId, userId, eventId, true);
}

export async function removeEventForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  eventId: Id<"calendarEvents">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const existing = await getEventInWorkspace(ctx, workspaceId, eventId);
  if (existing.isPrivate && existing.creatorId !== userId) {
    throw new Error("Event not found");
  }
  await ctx.db.delete(eventId);
  return null;
}
