import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { workspaceRole } from "./lib/validators";
import {
  createWorkspace,
  ensurePersonalWorkspace,
  getDefaultWorkspace,
  getWorkspace,
  listMembers,
  listMyWorkspaces,
  removeMember as removeMemberService,
  removeWorkspace,
  renameWorkspace,
  updateMemberRole as updateMemberRoleService,
} from "./workspaces/service";

export const list = query({
  args: {},
  handler: async (ctx) => await listMyWorkspaces(ctx),
});

export const defaultWorkspace = query({
  args: {},
  handler: async (ctx) => await getDefaultWorkspace(ctx),
});

export const get = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => await getWorkspace(ctx, args.workspaceId),
});

export const members = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => await listMembers(ctx, args.workspaceId),
});

export const ensurePersonal = mutation({
  args: { name: v.optional(v.string()) },
  handler: async (ctx, args) => await ensurePersonalWorkspace(ctx, args.name),
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => await createWorkspace(ctx, args.name),
});

export const update = mutation({
  args: { workspaceId: v.id("workspaces"), name: v.string() },
  handler: async (ctx, args) =>
    await renameWorkspace(ctx, args.workspaceId, args.name),
});

export const remove = mutation({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => await removeWorkspace(ctx, args.workspaceId),
});

export const updateMemberRole = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: workspaceRole,
  },
  handler: async (ctx, args) =>
    await updateMemberRoleService(ctx, args.workspaceId, args.userId, args.role),
});

export const removeMember = mutation({
  args: { workspaceId: v.id("workspaces"), userId: v.id("users") },
  handler: async (ctx, args) =>
    await removeMemberService(ctx, args.workspaceId, args.userId),
});
