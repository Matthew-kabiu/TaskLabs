import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export type NotificationType = Doc<"notifications">["type"];

export class NotificationNotFoundError extends Error {
  constructor(message = "Notification not found") {
    super(message);
    this.name = "NotificationNotFoundError";
  }
}

export function notificationDto(notification: Doc<"notifications">) {
  return {
    id: notification._id,
    userId: notification.userId,
    type: notification.type,
    payload: notification.payload,
    readAt:
      notification.readAt === undefined
        ? null
        : new Date(notification.readAt).toISOString(),
    createdAt: new Date(notification.createdAt).toISOString(),
  };
}

export async function createNotificationRecord(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    type: NotificationType;
    payload: unknown;
    now?: number;
  },
) {
  const notificationId = await ctx.db.insert("notifications", {
    userId: input.userId,
    type: input.type,
    payload: input.payload,
    createdAt: input.now ?? Date.now(),
  });
  const notification = await ctx.db.get(notificationId);
  if (notification === null) {
    throw new Error("Notification not found after create");
  }
  return notification;
}

export async function listNotificationsForUser(
  ctx: DbCtx,
  userId: Id<"users">,
  limit: number,
) {
  const rows = await ctx.db
    .query("notifications")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .order("desc")
    .take(limit);
  return rows;
}

export async function unreadNotificationCount(
  ctx: DbCtx,
  userId: Id<"users">,
) {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_user_readAt", (q) =>
      q.eq("userId", userId).eq("readAt", undefined),
    )
    .collect();
  return unread.length;
}

export async function getNotificationForUser(
  ctx: DbCtx,
  userId: Id<"users">,
  notificationId: Id<"notifications">,
) {
  const notification = await ctx.db.get(notificationId);
  if (notification === null || notification.userId !== userId) {
    throw new NotificationNotFoundError();
  }
  return notification;
}
