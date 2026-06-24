import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  requireMembership,
  requireMembershipForUser,
  requireUserId,
  requireWorkspaceRole,
  requireWorkspaceRoleForUser,
  roleAtLeast,
  type WorkspaceRole,
} from "../lib/auth";
import {
  countWorkspaceMembers,
  countWorkspaceOwners,
  deleteMembership,
  deleteWorkspaceRecord,
  findPersonalWorkspaceForUser,
  getMembership,
  getWorkspaceForUser,
  insertWorkspaceWithOwner,
  listWorkspaceMemberRows,
  listWorkspacesForUser,
  patchMembershipRole,
  updateWorkspaceName,
} from "./model";

function workspaceDto(entry: Awaited<ReturnType<typeof getWorkspaceForUser>>) {
  if (entry === null) {
    return null;
  }
  return {
    id: entry.workspace._id,
    name: entry.workspace.name,
    slug: entry.workspace.slug,
    isPersonal: entry.workspace.isPersonal,
    createdAt: entry.workspace.createdAt,
    updatedAt: entry.workspace.updatedAt,
    role: entry.membership.role,
  };
}

export async function listMyWorkspaces(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  const entries = await listWorkspacesForUser(ctx, userId);
  return entries.map((entry) => workspaceDto(entry));
}

export async function getDefaultWorkspace(ctx: QueryCtx) {
  const userId = await requireUserId(ctx);
  const personal = await findPersonalWorkspaceForUser(ctx, userId);
  if (personal !== null) {
    return workspaceDto(personal);
  }

  const [first] = await listWorkspacesForUser(ctx, userId);
  return first === undefined ? null : workspaceDto(first);
}

export async function getWorkspace(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
) {
  const userId = await requireUserId(ctx);
  return workspaceDto(await getWorkspaceForUser(ctx, userId, workspaceId));
}

export async function getWorkspaceForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  return workspaceDto(await getWorkspaceForUser(ctx, userId, workspaceId));
}

export async function ensurePersonalWorkspace(
  ctx: MutationCtx,
  name?: string,
) {
  const userId = await requireUserId(ctx);
  const existing = await findPersonalWorkspaceForUser(ctx, userId);
  if (existing !== null) {
    return workspaceDto(existing);
  }

  const now = Date.now();
  const workspace = await insertWorkspaceWithOwner(ctx, {
    userId,
    name: name ?? "Personal",
    isPersonal: true,
    now,
  });
  const created = await getWorkspaceForUser(ctx, userId, workspace._id);
  return workspaceDto(created);
}

export async function createWorkspace(ctx: MutationCtx, name: string) {
  const userId = await requireUserId(ctx);
  const workspace = await insertWorkspaceWithOwner(ctx, {
    userId,
    name,
    isPersonal: false,
    now: Date.now(),
  });
  const created = await getWorkspaceForUser(ctx, userId, workspace._id);
  return workspaceDto(created);
}

export async function renameWorkspace(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  name: string,
) {
  const { userId } = await requireWorkspaceRole(ctx, workspaceId, "ADMIN");
  await updateWorkspaceName(ctx, workspaceId, name, Date.now());
  return workspaceDto(await getWorkspaceForUser(ctx, userId, workspaceId));
}

export async function removeWorkspace(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
) {
  await requireWorkspaceRole(ctx, workspaceId, "OWNER");
  await deleteWorkspaceRecord(ctx, workspaceId);
  return null;
}

export async function listMembers(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
) {
  await requireMembership(ctx, workspaceId);
  return await listMembersForActor(ctx, workspaceId, undefined, true);
}

export async function listMembersForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId?: Id<"users">,
  membershipProven = false,
) {
  if (!membershipProven) {
    if (userId === undefined) throw new Error("Actor user is required");
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  return await listWorkspaceMemberRows(ctx, workspaceId);
}

export async function updateMemberRole(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  targetUserId: Id<"users">,
  role: WorkspaceRole,
) {
  const { userId, membership: actor } = await requireWorkspaceRole(
    ctx,
    workspaceId,
    "OWNER",
  );
  return await updateMemberRoleForActor(
    ctx,
    workspaceId,
    userId,
    actor.role,
    targetUserId,
    role,
    true,
  );
}

export async function updateMemberRoleForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  actorUserId: Id<"users">,
  actorRole: WorkspaceRole | undefined,
  targetUserId: Id<"users">,
  role: WorkspaceRole,
  membershipProven = false,
) {
  const finalActorRole =
    actorRole ??
    (await requireWorkspaceRoleForUser(ctx, workspaceId, actorUserId, "OWNER"))
      .role;
  if (!membershipProven && !roleAtLeast(finalActorRole, "OWNER")) {
    throw new Error("Requires OWNER or higher");
  }

  if (targetUserId === actorUserId && role !== "OWNER") {
    const ownerCount = await countWorkspaceOwners(ctx, workspaceId);
    if (finalActorRole === "OWNER" && ownerCount <= 1) {
      throw new Error("Cannot demote yourself as the last owner");
    }
  }

  return await patchMembershipRole(ctx, workspaceId, targetUserId, role);
}

export async function removeMember(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  targetUserId: Id<"users">,
) {
  const { userId, membership: actor } = await requireMembership(ctx, workspaceId);
  return await removeMemberForActor(
    ctx,
    workspaceId,
    userId,
    actor.role,
    targetUserId,
    true,
  );
}

export async function removeMemberForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  actorUserId: Id<"users">,
  actorRole: WorkspaceRole | undefined,
  targetUserId: Id<"users">,
  membershipProven = false,
) {
  const finalActorRole =
    actorRole ??
    (await requireMembershipForUser(ctx, workspaceId, actorUserId)).role;
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, actorUserId);
  }
  if (targetUserId !== actorUserId && !roleAtLeast(finalActorRole, "ADMIN")) {
    throw new Error("Requires ADMIN or higher");
  }

  const workspace = await ctx.db.get(workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found");
  }
  if (workspace.isPersonal) {
    throw new Error("Cannot remove members from a personal workspace");
  }

  const target = await getMembership(ctx, workspaceId, targetUserId);
  if (target === null) {
    throw new Error("Workspace member not found");
  }
  if (
    targetUserId !== actorUserId &&
    roleAtLeast(target.role, finalActorRole) &&
    target.role !== "MEMBER"
  ) {
    throw new Error("Cannot remove a member with equal or higher role");
  }

  if (targetUserId === actorUserId) {
    const ownerCount = await countWorkspaceOwners(ctx, workspaceId);
    const memberCount = await countWorkspaceMembers(ctx, workspaceId);
    if (finalActorRole === "OWNER" && ownerCount <= 1) {
      throw new Error("Cannot leave as the last owner");
    }
    if (memberCount <= 1) {
      throw new Error("Cannot remove yourself as the last member");
    }
  }

  await deleteMembership(ctx, workspaceId, targetUserId);
  return null;
}
