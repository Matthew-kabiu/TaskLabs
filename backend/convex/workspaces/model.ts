import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { WorkspaceRole } from "../lib/auth";

type DbCtx = QueryCtx | MutationCtx;

export class PersonalWorkspaceDeleteError extends Error {
  constructor(message = "Personal workspaces cannot be deleted") {
    super(message);
    this.name = "PersonalWorkspaceDeleteError";
  }
}

export function normalizeWorkspaceName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new Error("Workspace name is required");
  }
  if (trimmed.length > 80) {
    throw new Error("Workspace name must be at most 80 characters");
  }
  return trimmed;
}

export function slugifyWorkspaceName(name: string, now: number) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace";
  return `${base}-${Math.abs(now).toString(36).slice(-6)}`;
}

export async function listMembershipsForUser(ctx: DbCtx, userId: Id<"users">) {
  return await ctx.db
    .query("workspaceMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
}

export async function listWorkspacesForUser(ctx: DbCtx, userId: Id<"users">) {
  const memberships = await listMembershipsForUser(ctx, userId);
  const workspaces = await Promise.all(
    memberships.map(async (membership) => {
      const workspace = await ctx.db.get(membership.workspaceId);
      return workspace === null ? null : { workspace, membership };
    }),
  );

  return workspaces
    .filter(
      (
        entry,
      ): entry is {
        workspace: Doc<"workspaces">;
        membership: Doc<"workspaceMembers">;
      } => entry !== null,
    )
    .sort((a, b) => {
      if (a.workspace.isPersonal !== b.workspace.isPersonal) {
        return a.workspace.isPersonal ? -1 : 1;
      }
      return a.workspace.name.localeCompare(b.workspace.name);
    });
}

export async function getWorkspaceForUser(
  ctx: DbCtx,
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();
  if (membership === null) {
    return null;
  }

  const workspace = await ctx.db.get(workspaceId);
  return workspace === null ? null : { workspace, membership };
}

export async function findPersonalWorkspaceForUser(
  ctx: DbCtx,
  userId: Id<"users">,
) {
  const entries = await listWorkspacesForUser(ctx, userId);
  return entries.find((entry) => entry.workspace.isPersonal) ?? null;
}

export async function insertWorkspaceWithOwner(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    name: string;
    isPersonal: boolean;
    now: number;
  },
) {
  const name = normalizeWorkspaceName(input.name);
  const workspaceId = await ctx.db.insert("workspaces", {
    name,
    slug: slugifyWorkspaceName(name, input.now),
    isPersonal: input.isPersonal,
    createdAt: input.now,
    updatedAt: input.now,
  });

  await ctx.db.insert("workspaceMembers", {
    workspaceId,
    userId: input.userId,
    role: "OWNER",
    joinedAt: input.now,
  });

  const workspace = await ctx.db.get(workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found after create");
  }
  return workspace;
}

export async function updateWorkspaceName(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  name: string,
  now: number,
) {
  await ctx.db.patch(workspaceId, {
    name: normalizeWorkspaceName(name),
    updatedAt: now,
  });
  const workspace = await ctx.db.get(workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found");
  }
  return workspace;
}

export async function deleteWorkspaceRecord(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
) {
  const workspace = await ctx.db.get(workspaceId);
  if (workspace === null) {
    throw new Error("Workspace not found");
  }
  if (workspace.isPersonal) {
    throw new PersonalWorkspaceDeleteError();
  }

  const members = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const member of members) {
    await ctx.db.delete(member._id);
  }

  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const task of tasks) {
    const assignees = await ctx.db
      .query("taskAssignees")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .collect();
    for (const assignee of assignees) {
      await ctx.db.delete(assignee._id);
    }
    const taskLabels = await ctx.db
      .query("taskLabels")
      .withIndex("by_task", (q) => q.eq("taskId", task._id))
      .collect();
    for (const taskLabel of taskLabels) {
      await ctx.db.delete(taskLabel._id);
    }
    await ctx.db.delete(task._id);
  }

  const labels = await ctx.db
    .query("labels")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const label of labels) {
    await ctx.db.delete(label._id);
  }

  const events = await ctx.db
    .query("calendarEvents")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const event of events) {
    await ctx.db.delete(event._id);
  }

  const invitations = await ctx.db
    .query("invitations")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  for (const invitation of invitations) {
    await ctx.db.delete(invitation._id);
  }

  await ctx.db.delete(workspaceId);
}

export async function listWorkspaceMemberRows(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const rows = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();

  const members = await Promise.all(
    rows.map(async (membership) => {
      const user = await ctx.db.get(membership.userId);
      return {
        id: membership.userId,
        userId: membership.userId,
        email: user?.email ?? null,
        name: user?.name ?? null,
        role: membership.role,
        joinedAt: membership.joinedAt,
      };
    }),
  );

  return members.sort((a, b) => a.joinedAt - b.joinedAt);
}

export async function countWorkspaceMembers(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const rows = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return rows.length;
}

export async function countWorkspaceOwners(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const rows = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  return rows.filter((row) => row.role === "OWNER").length;
}

export async function getMembership(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", userId),
    )
    .unique();
}

export async function patchMembershipRole(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  role: WorkspaceRole,
) {
  const membership = await getMembership(ctx, workspaceId, userId);
  if (membership === null) {
    throw new Error("Workspace member not found");
  }
  await ctx.db.patch(membership._id, { role });
  return { userId, role };
}

export async function deleteMembership(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  const membership = await getMembership(ctx, workspaceId, userId);
  if (membership === null) {
    throw new Error("Workspace member not found");
  }
  await ctx.db.delete(membership._id);
}
