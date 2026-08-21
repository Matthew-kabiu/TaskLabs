import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export class TaskCommentNotFoundError extends Error {
  constructor(message = "Task comment not found") {
    super(message);
    this.name = "TaskCommentNotFoundError";
  }
}

export function normalizeCommentBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length < 1) {
    throw new Error("Task comment is required");
  }
  if (trimmed.length > 10_000) {
    throw new Error("Task comment must be at most 10000 characters");
  }
  return trimmed;
}

export function taskCommentDto(comment: Doc<"taskComments">) {
  return {
    id: comment._id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    body: comment.body,
    editedAt:
      comment.editedAt === undefined
        ? null
        : new Date(comment.editedAt).toISOString(),
    createdAt: new Date(comment.createdAt).toISOString(),
  };
}

export async function listTaskCommentRecords(
  ctx: DbCtx,
  taskId: Id<"tasks">,
) {
  return await ctx.db
    .query("taskComments")
    .withIndex("by_task_created", (q) => q.eq("taskId", taskId))
    .order("asc")
    .collect();
}

export async function getTaskCommentInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
  commentId: Id<"taskComments">,
) {
  const comment = await ctx.db.get(commentId);
  if (
    comment === null ||
    comment.workspaceId !== workspaceId ||
    comment.taskId !== taskId
  ) {
    throw new TaskCommentNotFoundError();
  }
  return comment;
}
