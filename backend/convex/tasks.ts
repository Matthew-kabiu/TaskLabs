import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { taskPriority, taskSort, taskStatus } from "./lib/validators";
import {
  createTask,
  getTask,
  listTasks,
  removeTask,
  removeTasks,
  reorderTasks,
  updateTask,
} from "./tasks/service";

const optionalTime = v.optional(v.union(v.number(), v.string()));
const nullableTime = v.optional(v.union(v.number(), v.string(), v.null()));

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    q: v.optional(v.string()),
    sort: v.optional(taskSort),
    dueFrom: optionalTime,
    dueTo: optionalTime,
  },
  handler: async (ctx, args) => await listTasks(ctx, args.workspaceId, args),
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), taskId: v.id("tasks") },
  handler: async (ctx, args) =>
    await getTask(ctx, args.workspaceId, args.taskId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    dueDate: optionalTime,
    isPrivate: v.optional(v.boolean()),
    position: v.optional(v.number()),
    assigneeIds: v.optional(v.array(v.id("users"))),
    labelIds: v.optional(v.array(v.id("labels"))),
  },
  handler: async (ctx, args) => await createTask(ctx, args.workspaceId, args),
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(taskStatus),
    priority: v.optional(taskPriority),
    dueDate: nullableTime,
    completedAt: nullableTime,
    isPrivate: v.optional(v.boolean()),
    position: v.optional(v.number()),
    assigneeIds: v.optional(v.array(v.id("users"))),
    labelIds: v.optional(v.array(v.id("labels"))),
  },
  handler: async (ctx, args) =>
    await updateTask(ctx, args.workspaceId, args.taskId, args),
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), taskId: v.id("tasks") },
  handler: async (ctx, args) =>
    await removeTask(ctx, args.workspaceId, args.taskId),
});

export const removeMany = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    taskIds: v.array(v.id("tasks")),
  },
  handler: async (ctx, args) =>
    await removeTasks(ctx, args.workspaceId, args.taskIds),
});

export const reorder = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    items: v.array(
      v.object({
        id: v.id("tasks"),
        position: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) =>
    await reorderTasks(ctx, args.workspaceId, args.items),
});
