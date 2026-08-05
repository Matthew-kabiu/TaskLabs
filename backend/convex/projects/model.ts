import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { parseOptionalTime } from "../tasks/model";

type DbCtx = QueryCtx | MutationCtx;

export type ProjectStatus = Doc<"projects">["status"];
export type ProjectPriority = Doc<"projects">["priority"];
export type ProjectResourceType = Doc<"projects">["resources"][number]["type"];
export type ProjectResource = {
  label: string;
  type: ProjectResourceType;
  url: string;
};

export class ProjectNotFoundError extends Error {
  constructor(message = "Project not found") {
    super(message);
    this.name = "ProjectNotFoundError";
  }
}

export class ProjectUpdateNotFoundError extends Error {
  constructor(message = "Project update not found") {
    super(message);
    this.name = "ProjectUpdateNotFoundError";
  }
}

export function normalizeProjectTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    throw new Error("Project title is required");
  }
  if (trimmed.length > 200) {
    throw new Error("Project title must be at most 200 characters");
  }
  return trimmed;
}

export function normalizeProjectDescription(description?: string | null) {
  if (description === undefined || description === null) {
    return undefined;
  }
  if (description.length > 10_000) {
    throw new Error("Project description must be at most 10000 characters");
  }
  return description;
}

export function normalizeProjectUpdateBody(body: string) {
  const trimmed = body.trim();
  if (trimmed.length < 1) {
    throw new Error("Project update is required");
  }
  if (trimmed.length > 10_000) {
    throw new Error("Project update must be at most 10000 characters");
  }
  return trimmed;
}

export function normalizeResourceUrl(url: string) {
  const trimmed = url.trim();
  if (trimmed.length < 1) {
    throw new Error("Resource url is required");
  }
  if (trimmed.length > 2048) {
    throw new Error("Resource url must be at most 2048 characters");
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "") {
      throw new Error("invalid");
    }
  } catch {
    throw new Error("Resource url must include a protocol (for example https://)");
  }
  return trimmed;
}

export function normalizeResourceLabel(label: string) {
  const trimmed = label.trim();
  if (trimmed.length < 1) {
    throw new Error("Resource label is required");
  }
  if (trimmed.length > 200) {
    throw new Error("Resource label must be at most 200 characters");
  }
  return trimmed;
}

export function normalizeResources(resources?: ProjectResource[]) {
  if (resources === undefined) {
    return undefined;
  }
  return resources.map((resource) => ({
    label: normalizeResourceLabel(resource.label),
    type: resource.type,
    url: normalizeResourceUrl(resource.url),
  }));
}

export function projectDto(project: Doc<"projects">) {
  return {
    id: project._id,
    workspaceId: project.workspaceId,
    creatorId: project.creatorId,
    title: project.title,
    description: project.description ?? null,
    status: project.status,
    priority: project.priority,
    memberIds: project.memberIds,
    startDate:
      project.startDate === undefined ? null : new Date(project.startDate).toISOString(),
    endDate:
      project.endDate === undefined ? null : new Date(project.endDate).toISOString(),
    resources: project.resources,
    createdAt: new Date(project.createdAt).toISOString(),
    updatedAt: new Date(project.updatedAt).toISOString(),
  };
}

export function projectUpdateDto(update: Doc<"projectUpdates">) {
  return {
    id: update._id,
    projectId: update.projectId,
    authorId: update.authorId,
    body: update.body,
    editedAt:
      update.editedAt === undefined
        ? null
        : new Date(update.editedAt).toISOString(),
    createdAt: new Date(update.createdAt).toISOString(),
  };
}

export async function listProjectRecords(ctx: DbCtx, workspaceId: Id<"workspaces">) {
  return await ctx.db
    .query("projects")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

export async function listProjectUpdateRecords(ctx: DbCtx, projectId: Id<"projects">) {
  return await ctx.db
    .query("projectUpdates")
    .withIndex("by_project", (q) => q.eq("projectId", projectId))
    .order("desc")
    .collect();
}

export async function getProjectInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects">,
): Promise<Doc<"projects">> {
  const project = await ctx.db.get(projectId);
  if (project === null || project.workspaceId !== workspaceId) {
    throw new ProjectNotFoundError();
  }
  return project;
}

export function parseOptionalProjectTime(value?: number | string | null) {
  return parseOptionalTime(value);
}

export function uniqueIds<T extends string>(ids: T[] | undefined) {
  if (ids === undefined) return undefined;
  return [...new Set(ids)];
}