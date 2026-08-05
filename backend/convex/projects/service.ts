import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership, requireMembershipForUser } from "../lib/auth";
import { deleteTaskRelations } from "../tasks/model";
import {
  getProjectInWorkspace,
  listProjectRecords,
  listProjectUpdateRecords,
  normalizeProjectDescription,
  normalizeProjectTitle,
  normalizeProjectUpdateBody,
  normalizeResources,
  parseOptionalProjectTime,
  projectDto,
  projectUpdateDto,
  uniqueIds,
  type ProjectPriority,
  type ProjectResource,
  type ProjectStatus,
} from "./model";

export type ListProjectsFilters = {
  status?: ProjectStatus;
  priority?: ProjectPriority;
  q?: string;
};

export type CreateProjectInput = {
  title: string;
  description?: string;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  memberIds?: Id<"users">[];
  startDate?: number | string | null;
  endDate?: number | string | null;
  resources?: ProjectResource[];
};

export type UpdateProjectInput = {
  title?: string;
  description?: string | null;
  status?: ProjectStatus;
  priority?: ProjectPriority;
  memberIds?: Id<"users">[];
  startDate?: number | string | null;
  endDate?: number | string | null;
  resources?: ProjectResource[];
};

async function validateMemberIds(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  memberIds: Id<"users">[] | undefined,
) {
  const ids = uniqueIds(memberIds);
  if (ids === undefined) return undefined;
  for (const userId of ids) {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", userId),
      )
      .unique();
    if (membership === null) {
      throw new Error("Project member must be a workspace member");
    }
  }
  return ids;
}

export async function listProjects(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  filters: ListProjectsFilters,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await listProjectsForActor(ctx, workspaceId, userId, filters, true);
}

export async function listProjectsForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  filters: ListProjectsFilters,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const q = filters.q?.trim().toLowerCase();
  const projects = (await listProjectRecords(ctx, workspaceId)).filter((project) => {
    if (filters.status !== undefined && project.status !== filters.status) {
      return false;
    }
    if (filters.priority !== undefined && project.priority !== filters.priority) {
      return false;
    }
    if (q !== undefined && q.length > 0) {
      const haystack = `${project.title}\n${project.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
  return projects
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map(projectDto);
}

export async function getProject(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await getProjectForActor(ctx, workspaceId, userId, projectId, true);
}

export async function getProjectForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  return projectDto(await getProjectInWorkspace(ctx, workspaceId, projectId));
}

export async function createProject(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  input: CreateProjectInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await createProjectForActor(ctx, workspaceId, userId, input, true);
}

export async function createProjectForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  input: CreateProjectInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const memberIds = await validateMemberIds(ctx, workspaceId, input.memberIds);
  const now = Date.now();
  const projectId = await ctx.db.insert("projects", {
    workspaceId,
    creatorId: userId,
    title: normalizeProjectTitle(input.title),
    description: normalizeProjectDescription(input.description),
    status: input.status ?? "PLANNING",
    priority: input.priority ?? "MEDIUM",
    memberIds: memberIds ?? [],
    startDate: parseOptionalProjectTime(input.startDate),
    endDate: parseOptionalProjectTime(input.endDate),
    resources: normalizeResources(input.resources) ?? [],
    createdAt: now,
    updatedAt: now,
  });
  const project = await ctx.db.get(projectId);
  if (project === null) {
    throw new Error("Project not found after create");
  }
  return projectDto(project);
}

export async function updateProject(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  input: UpdateProjectInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await updateProjectForActor(ctx, workspaceId, userId, projectId, input, true);
}

export async function updateProjectForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  input: UpdateProjectInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const existing = await getProjectInWorkspace(ctx, workspaceId, projectId);
  const memberIds = await validateMemberIds(ctx, workspaceId, input.memberIds);

  const patch: Partial<typeof existing> = {
    updatedAt: Date.now(),
  };

  if (input.title !== undefined) {
    patch.title = normalizeProjectTitle(input.title);
  }
  if (input.description !== undefined) {
    patch.description = normalizeProjectDescription(input.description);
  }
  if (input.status !== undefined) {
    patch.status = input.status;
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }
  if (input.memberIds !== undefined) {
    patch.memberIds = memberIds ?? [];
  }
  if (input.startDate !== undefined) {
    patch.startDate = parseOptionalProjectTime(input.startDate);
  }
  if (input.endDate !== undefined) {
    patch.endDate = parseOptionalProjectTime(input.endDate);
  }
  if (input.resources !== undefined) {
    patch.resources = normalizeResources(input.resources) ?? [];
  }

  await ctx.db.patch(projectId, patch);
  const project = await ctx.db.get(projectId);
  if (project === null) {
    throw new Error("Project not found after update");
  }
  return projectDto(project);
}

async function cascadeDeleteProject(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_project", (q) =>
      q.eq("workspaceId", workspaceId).eq("projectId", projectId),
    )
    .collect();
  for (const task of tasks) {
    await deleteTaskRelations(ctx, task._id);
    await ctx.db.delete(task._id);
  }
  const updates = await ctx.db
    .query("projectUpdates")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  for (const update of updates) {
    await ctx.db.delete(update._id);
  }
}

export async function removeProject(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeProjectForActor(ctx, workspaceId, userId, projectId, true);
}

export async function removeProjectForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getProjectInWorkspace(ctx, workspaceId, projectId);
  await cascadeDeleteProject(ctx, workspaceId, projectId);
  await ctx.db.delete(projectId);
  return null;
}

export async function listProjectUpdates(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await listProjectUpdatesForActor(ctx, workspaceId, userId, projectId, true);
}

export async function listProjectUpdatesForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getProjectInWorkspace(ctx, workspaceId, projectId);
  return (await listProjectUpdateRecords(ctx, projectId)).map(projectUpdateDto);
}

export async function addProjectUpdate(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  body: string,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await addProjectUpdateForActor(ctx, workspaceId, userId, projectId, body, true);
}

export async function addProjectUpdateForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  body: string,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getProjectInWorkspace(ctx, workspaceId, projectId);
  const now = Date.now();
  const updateId = await ctx.db.insert("projectUpdates", {
    workspaceId,
    projectId,
    authorId: userId,
    body: normalizeProjectUpdateBody(body),
    createdAt: now,
  });
  const update = await ctx.db.get(updateId);
  if (update === null) {
    throw new Error("Project update not found after create");
  }
  await ctx.db.patch(projectId, { updatedAt: now });
  return projectUpdateDto(update);
}

export async function removeProjectUpdate(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  updateId: Id<"projectUpdates">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeProjectUpdateForActor(
    ctx,
    workspaceId,
    userId,
    projectId,
    updateId,
    true,
  );
}

export async function removeProjectUpdateForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  updateId: Id<"projectUpdates">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getProjectInWorkspace(ctx, workspaceId, projectId);
  const update = await ctx.db.get(updateId);
  if (update === null || update.projectId !== projectId) {
    throw new Error("Project update not found");
  }
  if (update.authorId !== userId) {
    throw new Error("Only the author can remove a project update");
  }
  await ctx.db.delete(updateId);
  return null;
}