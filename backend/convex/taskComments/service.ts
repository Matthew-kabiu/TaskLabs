import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership, requireMembershipForUser } from "../lib/auth";
import { trackRagRemoval, trackRagUpsert } from "../rag/service";
import { getVisibleTaskInWorkspace } from "../tasks/model";
import {
  getTaskCommentInWorkspace,
  listTaskCommentRecords,
  normalizeCommentBody,
  taskCommentDto,
} from "./model";

export async function listTaskComments(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await listTaskCommentsForActor(ctx, workspaceId, userId, taskId, true);
}

export async function listTaskCommentsForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getVisibleTaskInWorkspace(ctx, workspaceId, userId, taskId);
  return (await listTaskCommentRecords(ctx, taskId)).map(taskCommentDto);
}

export async function addTaskComment(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
  body: string,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await addTaskCommentForActor(
    ctx,
    workspaceId,
    userId,
    taskId,
    body,
    true,
  );
}

export async function addTaskCommentForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  body: string,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getVisibleTaskInWorkspace(ctx, workspaceId, userId, taskId);
  const now = Date.now();
  const commentId = await ctx.db.insert("taskComments", {
    workspaceId,
    taskId,
    authorId: userId,
    body: normalizeCommentBody(body),
    createdAt: now,
  });
  const comment = await ctx.db.get(commentId);
  if (comment === null) {
    throw new Error("Task comment not found after create");
  }
  await trackRagUpsert(ctx, workspaceId, "taskComment", commentId);
  return taskCommentDto(comment);
}

export async function updateTaskComment(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
  commentId: Id<"taskComments">,
  body: string,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await updateTaskCommentForActor(
    ctx,
    workspaceId,
    userId,
    taskId,
    commentId,
    body,
    true,
  );
}

export async function updateTaskCommentForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  commentId: Id<"taskComments">,
  body: string,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getVisibleTaskInWorkspace(ctx, workspaceId, userId, taskId);
  const comment = await getTaskCommentInWorkspace(
    ctx,
    workspaceId,
    taskId,
    commentId,
  );
  if (comment.authorId !== userId) {
    throw new Error("Only the author can edit a task comment");
  }
  await ctx.db.patch(commentId, {
    body: normalizeCommentBody(body),
    editedAt: Date.now(),
  });
  const updated = await ctx.db.get(commentId);
  if (updated === null) {
    throw new Error("Task comment not found after update");
  }
  await trackRagUpsert(ctx, workspaceId, "taskComment", commentId);
  return taskCommentDto(updated);
}

export async function removeTaskComment(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
  commentId: Id<"taskComments">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeTaskCommentForActor(
    ctx,
    workspaceId,
    userId,
    taskId,
    commentId,
    true,
  );
}

export async function removeTaskCommentForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  commentId: Id<"taskComments">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getVisibleTaskInWorkspace(ctx, workspaceId, userId, taskId);
  const comment = await getTaskCommentInWorkspace(
    ctx,
    workspaceId,
    taskId,
    commentId,
  );
  if (comment.authorId !== userId) {
    throw new Error("Only the author can remove a task comment");
  }
  await ctx.db.delete(commentId);
  await trackRagRemoval(ctx, workspaceId, "taskComment", commentId);
  return null;
}
