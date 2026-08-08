import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership, requireMembershipForUser } from "../lib/auth";
import { deleteTaskRelations } from "../tasks/model";
import {
  getProjectInWorkspace,
  getProjectFavorite,
  listProjectFavorites,
  listProjectRecords,
  listProjectUpdateRecords,
  normalizeProjectDescription,
  normalizeProjectTitle,
  normalizeProjectUpdateBody,
  normalizeResources,
  parseOptionalProjectTime,
  projectDto,
  projectUpdateDto,
  ProjectNotFoundError,
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
  leadId?: Id<"users">;
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
  leadId?: Id<"users">;
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

async function validateLeadId(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  leadId: Id<"users">,
) {
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", workspaceId).eq("userId", leadId),
    )
    .unique();
  if (membership === null) {
    throw new Error("Project lead must be a workspace member");
  }
  return leadId;
}

function validateProjectDateRange(
  startDate: number | undefined,
  endDate: number | undefined,
) {
  if (startDate !== undefined && endDate !== undefined && endDate < startDate) {
    throw new Error("Project end date cannot be before its start date");
  }
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
  const favoriteIds = new Set(
    (await listProjectFavorites(ctx, workspaceId, userId)).map(
      (favorite) => favorite.projectId,
    ),
  );
  return projects
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .map((project) => projectDto(project, favoriteIds.has(project._id)));
}

export async function getProject(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  try {
    return await getProjectForActor(ctx, workspaceId, userId, projectId, true);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) return null;
    throw error;
  }
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
  const project = await getProjectInWorkspace(ctx, workspaceId, projectId);
  const favorite = await getProjectFavorite(ctx, projectId, userId);
  return projectDto(project, favorite !== null);
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
  const leadId = await validateLeadId(ctx, workspaceId, input.leadId ?? userId);
  const memberIds = await validateMemberIds(ctx, workspaceId, [
    ...(input.memberIds ?? []),
    leadId,
  ]);
  const startDate = parseOptionalProjectTime(input.startDate);
  const endDate = parseOptionalProjectTime(input.endDate);
  validateProjectDateRange(startDate, endDate);
  const now = Date.now();
  const projectId = await ctx.db.insert("projects", {
    workspaceId,
    creatorId: userId,
    leadId,
    title: normalizeProjectTitle(input.title),
    description: normalizeProjectDescription(input.description),
    status: input.status ?? "PLANNING",
    priority: input.priority ?? "MEDIUM",
    memberIds: memberIds ?? [],
    startDate,
    endDate,
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
  const leadId =
    input.leadId === undefined
      ? existing.leadId ?? existing.creatorId
      : await validateLeadId(ctx, workspaceId, input.leadId);
  const memberIds = await validateMemberIds(
    ctx,
    workspaceId,
    input.memberIds === undefined ? undefined : [...input.memberIds, leadId],
  );
  const startDate =
    input.startDate === undefined
      ? existing.startDate
      : parseOptionalProjectTime(input.startDate);
  const endDate =
    input.endDate === undefined
      ? existing.endDate
      : parseOptionalProjectTime(input.endDate);
  validateProjectDateRange(startDate, endDate);

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
  if (input.leadId !== undefined) {
    patch.leadId = leadId;
    if (!existing.memberIds.includes(leadId) && input.memberIds === undefined) {
      patch.memberIds = [...existing.memberIds, leadId];
    }
  }
  if (input.startDate !== undefined) {
    patch.startDate = startDate;
  }
  if (input.endDate !== undefined) {
    patch.endDate = endDate;
  }
  if (input.resources !== undefined) {
    patch.resources = normalizeResources(input.resources) ?? [];
  }

  await ctx.db.patch(projectId, patch);
  const project = await ctx.db.get(projectId);
  if (project === null) {
    throw new Error("Project not found after update");
  }
  const favorite = await getProjectFavorite(ctx, projectId, userId);
  return projectDto(project, favorite !== null);
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
  const favorites = await ctx.db
    .query("projectFavorites")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .collect();
  for (const favorite of favorites) {
    await ctx.db.delete(favorite._id);
  }
}

export async function setProjectFavorite(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
  isFavorite: boolean,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await setProjectFavoriteForActor(
    ctx,
    workspaceId,
    userId,
    projectId,
    isFavorite,
    true,
  );
}

export async function setProjectFavoriteForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  projectId: Id<"projects">,
  isFavorite: boolean,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  await getProjectInWorkspace(ctx, workspaceId, projectId);
  const existing = await getProjectFavorite(ctx, projectId, userId);
  if (isFavorite && existing === null) {
    await ctx.db.insert("projectFavorites", {
      workspaceId,
      projectId,
      userId,
      createdAt: Date.now(),
    });
  } else if (!isFavorite && existing !== null) {
    await ctx.db.delete(existing._id);
  }
  return { isFavorite };
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
