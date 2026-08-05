import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  acceptInvitation,
  createInvitation,
  listPendingInvitations,
  resendInvitation,
  revokeInvitation,
  validateInvitation,
} from "./invitations/service";

export const pending = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) =>
    await listPendingInvitations(ctx, args.workspaceId),
});

const invitationRole = v.union(v.literal("MEMBER"), v.literal("ADMIN"));

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    email: v.string(),
    role: v.optional(invitationRole),
  },
  handler: async (ctx, args) =>
    await createInvitation(ctx, args.workspaceId, args.email, args.role),
});

export const revoke = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) =>
    await revokeInvitation(ctx, args.workspaceId, args.invitationId),
});

export const resend = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    invitationId: v.id("invitations"),
  },
  handler: async (ctx, args) =>
    await resendInvitation(ctx, args.workspaceId, args.invitationId),
});

export const validate = query({
  args: { token: v.string() },
  handler: async (ctx, args) => await validateInvitation(ctx, args.token),
});

export const accept = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => await acceptInvitation(ctx, args.token),
});
