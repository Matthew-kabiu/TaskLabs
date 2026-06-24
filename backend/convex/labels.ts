import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  createLabel,
  listLabels,
  removeLabel,
  updateLabel,
} from "./labels/service";

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => await listLabels(ctx, args.workspaceId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
  },
  handler: async (ctx, args) => await createLabel(ctx, args.workspaceId, args),
});

export const update = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    labelId: v.id("labels"),
    name: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) =>
    await updateLabel(ctx, args.workspaceId, args.labelId, args),
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces"), labelId: v.id("labels") },
  handler: async (ctx, args) =>
    await removeLabel(ctx, args.workspaceId, args.labelId),
});
