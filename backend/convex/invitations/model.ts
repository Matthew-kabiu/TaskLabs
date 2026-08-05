import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

const EXPIRY_MS = 72 * 60 * 60 * 1000;

export class InvitationInvalidError extends Error {
  constructor(message = "Invalid invitation token") {
    super(message);
    this.name = "InvitationInvalidError";
  }
}

export class InvitationExpiredError extends Error {
  constructor(message = "Invitation has expired") {
    super(message);
    this.name = "InvitationExpiredError";
  }
}

export function newInvitationExpiry(now = Date.now()) {
  return now + EXPIRY_MS;
}

export function normalizeInvitationEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 255) {
    throw new Error("Invalid invitation email");
  }
  return trimmed;
}

export function makeInvitationToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function hashInvitationToken(token: string) {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function invitationDto(invitation: Doc<"invitations">) {
  return {
    id: invitation._id,
    email: invitation.email,
    workspaceId: invitation.workspaceId,
    invitedById: invitation.invitedById,
    role: invitation.role ?? "MEMBER",
    expiresAt: new Date(invitation.expiresAt).toISOString(),
    acceptedAt:
      invitation.acceptedAt === undefined
        ? null
        : new Date(invitation.acceptedAt).toISOString(),
    revokedAt:
      invitation.revokedAt === undefined
        ? null
        : new Date(invitation.revokedAt).toISOString(),
    createdAt: new Date(invitation.createdAt).toISOString(),
  };
}

export async function getInvitationByToken(
  ctx: DbCtx,
  plaintextToken: string,
) {
  const tokenHash = await hashInvitationToken(plaintextToken);
  const invitation = await ctx.db
    .query("invitations")
    .withIndex("by_token_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (invitation === null) throw new InvitationInvalidError();
  if (invitation.acceptedAt !== undefined) {
    throw new InvitationInvalidError("Invitation already accepted");
  }
  if (invitation.revokedAt !== undefined) {
    throw new InvitationInvalidError("Invitation has been revoked");
  }
  if (invitation.expiresAt < Date.now()) throw new InvitationExpiredError();
  return invitation;
}

export async function listPendingInvitationsForWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const rows = await ctx.db
    .query("invitations")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return rows
    .filter(
      (row) =>
        row.acceptedAt === undefined &&
        row.revokedAt === undefined &&
        row.expiresAt >= Date.now(),
    )
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getInvitationInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  invitationId: Id<"invitations">,
) {
  const invitation = await ctx.db.get(invitationId);
  if (invitation === null || invitation.workspaceId !== workspaceId) {
    throw new InvitationInvalidError("Invitation not found");
  }
  return invitation;
}
