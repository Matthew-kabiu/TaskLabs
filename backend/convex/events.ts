import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { eventColor, eventStatus } from "./lib/validators";
import {
  createEvent,
  getEvent,
  listEvents,
  removeEvent,
  setEventCompletion,
  updateEvent,
} from "./events/service";

const requiredTime = v.union(v.number(), v.string());
const optionalNullableTime = v.optional(v.union(v.number(), v.string(), v.null()));

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    from: requiredTime,
    to: requiredTime,
  },
  handler: async (ctx, args) => await listEvents(ctx, args.workspaceId, args),
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), eventId: v.id("calendarEvents") },
  handler: async (ctx, args) =>
    await getEvent(ctx, args.workspaceId, args.eventId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.union(v.string(), v.null())),
    startAt: requiredTime,
    endAt: requiredTime,
    allDay: v.optional(v.boolean()),
    color: v.optional(v.union(eventColor, v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    isPrivate: v.optional(v.boolean()),
    rrule: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => await createEvent(ctx, args.workspaceId, args),
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    eventId: v.id("calendarEvents"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    startAt: v.optional(requiredTime),
    endAt: v.optional(requiredTime),
    allDay: v.optional(v.boolean()),
    color: v.optional(v.union(eventColor, v.null())),
    location: v.optional(v.union(v.string(), v.null())),
    isPrivate: v.optional(v.boolean()),
    rrule: v.optional(v.union(v.string(), v.null())),
    status: v.optional(eventStatus),
    completedAt: optionalNullableTime,
  },
  handler: async (ctx, args) =>
    await updateEvent(ctx, args.workspaceId, args.eventId, args),
});

export const complete = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    eventId: v.id("calendarEvents"),
    completed: v.boolean(),
  },
  handler: async (ctx, args) =>
    await setEventCompletion(
      ctx,
      args.workspaceId,
      args.eventId,
      args.completed,
    ),
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), eventId: v.id("calendarEvents") },
  handler: async (ctx, args) =>
    await removeEvent(ctx, args.workspaceId, args.eventId),
});
