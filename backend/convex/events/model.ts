import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export type EventStatus = Doc<"calendarEvents">["status"];

export class EventNotFoundError extends Error {
  constructor(message = "Event not found") {
    super(message);
    this.name = "EventNotFoundError";
  }
}

const EVENT_COLORS = new Set([
  "slate",
  "red",
  "orange",
  "amber",
  "green",
  "teal",
  "blue",
  "violet",
]);

export function normalizeEventTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    throw new Error("Event title is required");
  }
  if (trimmed.length > 200) {
    throw new Error("Event title must be at most 200 characters");
  }
  return trimmed;
}

export function normalizeNullableText(
  value: string | null | undefined,
  max: number,
  label: string,
) {
  if (value === undefined || value === null) return undefined;
  if (value.length > max) {
    throw new Error(`${label} must be at most ${max} characters`);
  }
  return value;
}

export function normalizeEventColor(value: string | null | undefined) {
  if (value === undefined || value === null || value === "") return undefined;
  if (!EVENT_COLORS.has(value)) {
    throw new Error("Unknown event color");
  }
  return value;
}

export function parseTime(value: number | string) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Date value must be finite");
    }
    return value;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Date value must be an ISO date string or epoch milliseconds");
  }
  return parsed;
}

export function parseOptionalTime(value?: number | string | null) {
  if (value === undefined || value === null) return undefined;
  return parseTime(value);
}

export function normalizeRrule(value: string | null | undefined) {
  if (value === undefined || value === null || value.trim() === "") {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed.length > 500) {
    throw new Error("RRULE must be at most 500 characters");
  }
  if (!trimmed.startsWith("FREQ=") && !trimmed.startsWith("RRULE:FREQ=")) {
    throw new Error("RRULE must start with FREQ=");
  }
  return trimmed.startsWith("RRULE:") ? trimmed.slice(6) : trimmed;
}

export function assertEventRange(startAt: number, endAt: number) {
  if (endAt < startAt) {
    throw new Error("endAt must be at or after startAt");
  }
}

export function canReadEvent(event: Doc<"calendarEvents">, userId: Id<"users">) {
  return !event.isPrivate || event.creatorId === userId;
}

export function eventDto(
  event: Doc<"calendarEvents">,
  occurrence?: { startAt: number; endAt: number; occurrenceStart: number },
) {
  const startAt = occurrence?.startAt ?? event.startAt;
  const endAt = occurrence?.endAt ?? event.endAt;
  return {
    id: event._id,
    workspaceId: event.workspaceId,
    creatorId: event.creatorId,
    title: event.title,
    description: event.description ?? null,
    startAt: new Date(startAt).toISOString(),
    endAt: new Date(endAt).toISOString(),
    allDay: event.allDay,
    color: event.color ?? null,
    location: event.location ?? null,
    isPrivate: event.isPrivate,
    rrule: event.rrule ?? null,
    recurrenceParentId: event.recurrenceParentId ?? null,
    status: event.status,
    completedAt:
      event.completedAt === undefined
        ? null
        : new Date(event.completedAt).toISOString(),
    occurrenceStart:
      occurrence === undefined
        ? undefined
        : new Date(occurrence.occurrenceStart).toISOString(),
    createdAt: new Date(event.createdAt).toISOString(),
    updatedAt: new Date(event.updatedAt).toISOString(),
  };
}

export async function listEventRecords(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  return await ctx.db
    .query("calendarEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

export async function getEventInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  eventId: Id<"calendarEvents">,
) {
  const event = await ctx.db.get(eventId);
  if (event === null || event.workspaceId !== workspaceId) {
    throw new EventNotFoundError();
  }
  return event;
}

type RruleParts = {
  freq?: "DAILY" | "WEEKLY" | "MONTHLY";
  interval: number;
  count?: number;
  until?: number;
};

function parseRruleParts(rrule: string): RruleParts | null {
  const parts: RruleParts = { interval: 1 };
  for (const chunk of rrule.split(";")) {
    const [key, rawValue] = chunk.split("=");
    if (key === "FREQ") {
      if (rawValue === "DAILY" || rawValue === "WEEKLY" || rawValue === "MONTHLY") {
        parts.freq = rawValue;
      }
    }
    if (key === "INTERVAL") {
      const interval = Number(rawValue);
      if (Number.isInteger(interval) && interval > 0) parts.interval = interval;
    }
    if (key === "COUNT") {
      const count = Number(rawValue);
      if (Number.isInteger(count) && count > 0) parts.count = count;
    }
    if (key === "UNTIL") {
      const normalized = rawValue.includes("T")
        ? rawValue.replace(
            /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/,
            "$1-$2-$3T$4:$5:$6Z",
          )
        : rawValue;
      const until = Date.parse(normalized);
      if (Number.isFinite(until)) parts.until = until;
    }
  }
  return parts.freq === undefined ? null : parts;
}

function addInterval(start: number, parts: RruleParts, index: number) {
  const date = new Date(start);
  if (parts.freq === "DAILY") {
    date.setUTCDate(date.getUTCDate() + index * parts.interval);
  } else if (parts.freq === "WEEKLY") {
    date.setUTCDate(date.getUTCDate() + index * parts.interval * 7);
  } else {
    date.setUTCMonth(date.getUTCMonth() + index * parts.interval);
  }
  return date.getTime();
}

export function expandEventOccurrences(
  event: Doc<"calendarEvents">,
  from: number,
  to: number,
) {
  const duration = event.endAt - event.startAt;
  if (event.rrule === undefined) {
    return event.endAt >= from && event.startAt <= to
      ? [{ startAt: event.startAt, endAt: event.endAt, occurrenceStart: event.startAt }]
      : [];
  }

  const parts = parseRruleParts(event.rrule);
  if (parts === null) return [];
  const maxCount = parts.count ?? 366;
  const occurrences: { startAt: number; endAt: number; occurrenceStart: number }[] = [];
  for (let index = 0; index < maxCount; index += 1) {
    const startAt = addInterval(event.startAt, parts, index);
    if (parts.until !== undefined && startAt > parts.until) break;
    const endAt = startAt + duration;
    if (endAt >= from && startAt <= to) {
      occurrences.push({ startAt, endAt, occurrenceStart: startAt });
    }
    if (startAt > to) break;
  }
  return occurrences;
}
