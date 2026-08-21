import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  addTaskComment,
  listTaskComments,
  removeTaskComment,
  updateTaskComment,
} from "./taskComments/service";

export const list = query({
  args: { workspaceId: v.id("workspaces"), taskId: v.id("tasks") },
  handler: async (ctx, args) =>
    await listTaskComments(ctx, args.workspaceId, args.taskId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    body: v.string(),
  },
  handler: async (ctx, args) =>
    await addTaskComment(ctx, args.workspaceId, args.taskId, args.body),
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    commentId: v.id("taskComments"),
    body: v.string(),
  },
  handler: async (ctx, args) =>
    await updateTaskComment(
      ctx,
      args.workspaceId,
      args.taskId,
      args.commentId,
      args.body,
    ),
});

export const remove = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    commentId: v.id("taskComments"),
  },
  handler: async (ctx, args) =>
    await removeTaskComment(
      ctx,
      args.workspaceId,
      args.taskId,
      args.commentId,
    ),
});
