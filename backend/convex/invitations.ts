import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  acceptInvitation,
  createInvitation,
  listPendingInvitations,
  validateInvitation,
} from "./invitations/service";

export const pending = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) =>
    await listPendingInvitations(ctx, args.workspaceId),
});

export const create = mutation({
  args: { workspaceId: v.id("workspaces"), email: v.string() },
  handler: async (ctx, args) =>
    await createInvitation(ctx, args.workspaceId, args.email),
});

export const validate = query({
  args: { token: v.string() },
  handler: async (ctx, args) => await validateInvitation(ctx, args.token),
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => await acceptInvitation(ctx, args.token),
});
