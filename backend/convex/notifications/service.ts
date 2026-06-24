import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireUserId } from "../lib/auth";
import type { NotificationType } from "./model";
import {
  createNotificationRecord,
  getNotificationForUser,
  listNotificationsForUser,
  notificationDto,
  unreadNotificationCount,
} from "./model";

function normalizeLimit(limit?: number) {
  if (limit === undefined) return 50;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    throw new Error("Notification limit must be an integer from 1 to 100");
  }
  return limit;
}

export async function createNotification(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    type: NotificationType;
    payload: unknown;
  },
) {
  return notificationDto(await createNotificationRecord(ctx, input));
}

export async function listMine(ctx: QueryCtx, limit?: number) {
  const userId = await requireUserId(ctx);
  return await listForActor(ctx, userId, limit);
}

export async function listForActor(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
  limit?: number,
) {
  return (await listNotificationsForUser(ctx, userId, normalizeLimit(limit))).map(
    notificationDto,
  );
}

export async function unreadCount(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  return await unreadCountForActor(ctx, userId);
}

export async function unreadCountForActor(
  ctx: QueryCtx | MutationCtx,
  userId: Id<"users">,
) {
  return await unreadNotificationCount(ctx, userId);
}

export async function markRead(
  ctx: MutationCtx,
  notificationId: Id<"notifications">,
) {
  const userId = await requireUserId(ctx);
  return await markReadForActor(ctx, userId, notificationId);
}

export async function markReadForActor(
  ctx: MutationCtx,
  userId: Id<"users">,
  notificationId: Id<"notifications">,
) {
  const notification = await getNotificationForUser(ctx, userId, notificationId);
  if (notification.readAt === undefined) {
    await ctx.db.patch(notificationId, { readAt: Date.now() });
  }
  const updated = await ctx.db.get(notificationId);
  if (updated === null) {
    throw new Error("Notification not found after update");
  }
  return notificationDto(updated);
}

export async function markAllRead(ctx: MutationCtx) {
  const userId = await requireUserId(ctx);
  return await markAllReadForActor(ctx, userId);
}

export async function markAllReadForActor(ctx: MutationCtx, userId: Id<"users">) {
  const unread = await ctx.db
    .query("notifications")
    .withIndex("by_user_readAt", (q) =>
      q.eq("userId", userId).eq("readAt", undefined),
    )
    .collect();
  const now = Date.now();
  for (const notification of unread) {
    await ctx.db.patch(notification._id, { readAt: now });
  }
  return { updated: unread.length };
}
