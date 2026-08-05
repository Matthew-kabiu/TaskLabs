import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { projectResource, projectStatus, taskPriority } from "./lib/validators";
import {
  addProjectUpdate,
  createProject,
  getProject,
  listProjectUpdates,
  listProjects,
  removeProject,
  removeProjectUpdate,
  updateProject,
} from "./projects/service";

const optionalTime = v.optional(v.union(v.number(), v.string(), v.null()));

export const list = query({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.optional(projectStatus),
    priority: v.optional(taskPriority),
    q: v.optional(v.string()),
  },
  handler: async (ctx, args) => await listProjects(ctx, args.workspaceId, args),
});

export const get = query({
  args: { workspaceId: v.id("workspaces"), projectId: v.id("projects") },
  handler: async (ctx, args) =>
    await getProject(ctx, args.workspaceId, args.projectId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.optional(projectStatus),
    priority: v.optional(taskPriority),
    memberIds: v.optional(v.array(v.id("users"))),
    startDate: optionalTime,
    endDate: optionalTime,
    resources: v.optional(v.array(projectResource)),
  },
  handler: async (ctx, args) => await createProject(ctx, args.workspaceId, args),
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    title: v.optional(v.string()),
    description: v.optional(v.union(v.string(), v.null())),
    status: v.optional(projectStatus),
    priority: v.optional(taskPriority),
    memberIds: v.optional(v.array(v.id("users"))),
    startDate: optionalTime,
    endDate: optionalTime,
    resources: v.optional(v.array(projectResource)),
  },
  handler: async (ctx, args) =>
    await updateProject(ctx, args.workspaceId, args.projectId, args),
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), projectId: v.id("projects") },
  handler: async (ctx, args) =>
    await removeProject(ctx, args.workspaceId, args.projectId),
});

export const updatesList = query({
  args: { workspaceId: v.id("workspaces"), projectId: v.id("projects") },
  handler: async (ctx, args) =>
    await listProjectUpdates(ctx, args.workspaceId, args.projectId),
});

export const addUpdate = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    body: v.string(),
  },
  handler: async (ctx, args) =>
    await addProjectUpdate(ctx, args.workspaceId, args.projectId, args.body),
});

export const removeUpdate = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    updateId: v.id("projectUpdates"),
  },
  handler: async (ctx, args) =>
    await removeProjectUpdate(
      ctx,
      args.workspaceId,
      args.projectId,
      args.updateId,
    ),
});