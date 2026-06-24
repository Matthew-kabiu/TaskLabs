import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { notificationType } from "./lib/validators";
import {
  createNotification,
  listMine,
  markAllRead as markAllReadService,
  markRead as markReadService,
  unreadCount,
} from "./notifications/service";

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => await listMine(ctx, args.limit),
});

export const unread = query({
  args: {},
  handler: async (ctx) => await unreadCount(ctx),
});

export const createForUser = internalMutation({
  args: {
    userId: v.id("users"),
    type: notificationType,
    payload: v.any(),
  },
  handler: async (ctx, args) => await createNotification(ctx, args),
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) =>
    await markReadService(ctx, args.notificationId),
});

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => await markAllReadService(ctx),
});
