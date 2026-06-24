import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireUserId, requireWorkspaceRole } from "../lib/auth";
import { createNotificationRecord } from "../notifications/model";
import {
  getInvitationByToken,
  hashInvitationToken,
  invitationDto,
  listPendingInvitationsForWorkspace,
  makeInvitationToken,
  newInvitationExpiry,
  normalizeInvitationEmail,
} from "./model";

export async function listPendingInvitations(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
) {
  await requireWorkspaceRole(ctx, workspaceId, "ADMIN");
  return (await listPendingInvitationsForWorkspace(ctx, workspaceId)).map(
    invitationDto,
  );
}

export async function createInvitation(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  email: string,
) {
  const { userId } = await requireWorkspaceRole(ctx, workspaceId, "ADMIN");
  const normalizedEmail = normalizeInvitationEmail(email);
  const token = makeInvitationToken();
  const now = Date.now();
  const invitationId = await ctx.db.insert("invitations", {
    email: normalizedEmail,
    tokenHash: await hashInvitationToken(token),
    workspaceId,
    invitedById: userId,
    expiresAt: newInvitationExpiry(now),
    createdAt: now,
  });
  const invitation = await ctx.db.get(invitationId);
  if (invitation === null) {
    throw new Error("Invitation not found after create");
  }
  return { ...invitationDto(invitation), token, invitePath: `/invite/${token}` };
}

export async function validateInvitation(
  ctx: QueryCtx,
  token: string,
) {
  const invitation = await getInvitationByToken(ctx, token);
  const workspace = await ctx.db.get(invitation.workspaceId);
  return {
    ...invitationDto(invitation),
    workspaceName: workspace?.name ?? null,
  };
}

export async function acceptInvitation(ctx: MutationCtx, token: string) {
  const invitation = await getInvitationByToken(ctx, token);
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (user?.email?.toLowerCase() !== invitation.email) {
    throw new Error("Invitation email does not match the signed-in user");
  }

  const existingMembership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", invitation.workspaceId).eq("userId", userId),
    )
    .unique();
  if (existingMembership === null) {
    await ctx.db.insert("workspaceMembers", {
      workspaceId: invitation.workspaceId,
      userId,
      role: "MEMBER",
      joinedAt: Date.now(),
    });
  }
  await ctx.db.patch(invitation._id, { acceptedAt: Date.now() });
  await createNotificationRecord(ctx, {
    userId: invitation.invitedById,
    type: "INVITE_ACCEPTED",
    payload: {
      workspaceId: invitation.workspaceId,
      invitedEmail: invitation.email,
      acceptedById: userId,
    },
  });
  return { userId, email: invitation.email, workspaceId: invitation.workspaceId };
}
