import { getAuthUserId } from "@convex-dev/auth/server";
import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class WorkspaceForbiddenError extends Error {
  constructor(message = "Forbidden: not a member of this workspace") {
    super(message);
    this.name = "WorkspaceForbiddenError";
  }
}

export class WorkspaceRoleError extends Error {
  constructor(message = "Insufficient workspace role") {
    super(message);
    this.name = "WorkspaceRoleError";
  }
}

type AuthCtx = QueryCtx | MutationCtx;

/**
 * Resolve the signed-in user id, or throw Unauthorized.
 * Call at the top of EVERY protected query/mutation/action — this is the
 * Convex equivalent of the old `authenticate` middleware.
 */
export async function requireUserId(ctx: AuthCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new UnauthorizedError();
  }
  return userId;
}

/**
 * Resolve the user's membership in a workspace, or throw.
 * Enforces multi-tenancy: every data access must be scoped to a workspace the
 * caller belongs to. (The old app's #1 invariant — preserve it.)
 */
export async function requireMembership(
  ctx: AuthCtx,
  workspaceId: Id<"workspaces">,
) {
  const userId = await requireUserId(ctx);
  const membership = await requireMembershipForUser(ctx, workspaceId, userId);
  return { userId, membership };
}

export async function requireMembershipForUser(
  ctx: AuthCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();
  if (membership === null) {
    throw new WorkspaceForbiddenError();
  }
  return membership;
}

const ROLE_RANK = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
} as const;

export type WorkspaceRole = keyof typeof ROLE_RANK;

export function roleAtLeast(role: WorkspaceRole, minRole: WorkspaceRole) {
  return ROLE_RANK[role] >= ROLE_RANK[minRole];
}

export async function requireWorkspaceRole(
  ctx: AuthCtx,
  workspaceId: Id<"workspaces">,
  minRole: WorkspaceRole,
) {
  const result = await requireMembership(ctx, workspaceId);
  if (!roleAtLeast(result.membership.role, minRole)) {
    throw new WorkspaceRoleError(`Requires ${minRole} or higher`);
  }
  return result;
}

export async function requireWorkspaceRoleForUser(
  ctx: AuthCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  minRole: WorkspaceRole,
) {
  const membership = await requireMembershipForUser(ctx, workspaceId, userId);
  if (!roleAtLeast(membership.role, minRole)) {
    throw new WorkspaceRoleError(`Requires ${minRole} or higher`);
  }
  return membership;
}
