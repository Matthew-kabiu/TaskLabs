/**
 * Ice RAG — canonical source readers, DTOs, and database helpers.
 *
 * Model layer owns `ctx.db` only. Tenant identity is proven by callers;
 * every read re-checks workspace scope and private-visibility rules so a
 * permission change between indexing and retrieval is enforced at read time.
 */

import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { canReadEvent } from "../events/model";
import { canReadTask } from "../tasks/model";
import type { RagSourceType } from "./providers";

type DbCtx = QueryCtx | MutationCtx;

export class RagNotFoundError extends Error {
  constructor(message = "RAG source not found") {
    super(message);
    this.name = "RagNotFoundError";
  }
}

export class RagForbiddenError extends Error {
  constructor(message = "Forbidden: RAG source is not visible to you") {
    super(message);
    this.name = "RagForbiddenError";
  }
}

export type CanonicalLinkTarget =
  | { page: "task"; id: string }
  | { page: "project"; id: string }
  | { page: "event"; id: string }
  | { page: "tasks" }
  | { page: "docs" };

export type CanonicalSource = {
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  text: string;
  anchor: string;
  target: CanonicalLinkTarget;
};

function taskAnchor(task: Doc<"tasks">): string {
  return `task#${task.number}`;
}

function commentAnchor(comment: Doc<"taskComments">): string {
  return `comment:${comment._id}`;
}

function projectAnchor(project: Doc<"projects">): string {
  return `project:${project._id}`;
}

function projectUpdateAnchor(update: Doc<"projectUpdates">): string {
  return `project:${update.projectId}#update:${update._id}`;
}

function eventAnchor(event: Doc<"calendarEvents">): string {
  return `event:${event._id}`;
}

function taskText(task: Doc<"tasks">): string {
  const lines = [
    `Task: ${task.title}`,
    `Status: ${task.status}`,
    `Priority: ${task.priority}`,
  ];
  if (task.dueDate !== undefined) lines.push(`Due: ${new Date(task.dueDate).toISOString()}`);
  if (task.completedAt !== undefined) lines.push(`Completed: ${new Date(task.completedAt).toISOString()}`);
  if (task.description) lines.push(`Description: ${task.description}`);
  return lines.join("\n");
}

function projectText(project: Doc<"projects">): string {
  const lines = [`Project: ${project.title}`, `Status: ${project.status}`];
  if (project.description) lines.push(`Description: ${project.description}`);
  return lines.join("\n");
}

function eventText(event: Doc<"calendarEvents">): string {
  const lines = [
    `Event: ${event.title}`,
    `Status: ${event.status}`,
    `Start: ${new Date(event.startAt).toISOString()}`,
    `End: ${new Date(event.endAt).toISOString()}`,
  ];
  if (event.location) lines.push(`Location: ${event.location}`);
  if (event.description) lines.push(`Description: ${event.description}`);
  return lines.join("\n");
}

/**
 * Read one canonical source. Returns null when the source is gone (its index
 * rows are then stale and must be dropped by the caller).
 * Throws RagForbiddenError when the source exists but `userId` may not see it.
 */
export async function readCanonicalSource(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  sourceType: RagSourceType,
  sourceId: string,
): Promise<CanonicalSource | null> {
  switch (sourceType) {
    case "task": {
      const task = await ctx.db.get(sourceId as Id<"tasks">);
      if (task === null || task.workspaceId !== workspaceId) return null;
      if (!canReadTask(task, userId)) throw new RagForbiddenError();
      return {
        sourceType,
        sourceId,
        title: task.title,
        text: taskText(task),
        anchor: taskAnchor(task),
        target: { page: "task", id: sourceId },
      };
    }
    case "taskComment": {
      const comment = await ctx.db.get(sourceId as Id<"taskComments">);
      if (comment === null || comment.workspaceId !== workspaceId) return null;
      const task = await ctx.db.get(comment.taskId);
      if (task === null || task.workspaceId !== workspaceId) return null;
      if (!canReadTask(task, userId)) throw new RagForbiddenError();
      return {
        sourceType,
        sourceId,
        title: `Comment on ${task.title}`,
        text: `Comment on task "${task.title}" (task#${task.number}):\n${comment.body}`,
        anchor: commentAnchor(comment),
        target: { page: "task", id: task._id },
      };
    }
    case "project": {
      const project = await ctx.db.get(sourceId as Id<"projects">);
      if (project === null || project.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: project.title,
        text: projectText(project),
        anchor: projectAnchor(project),
        target: { page: "project", id: sourceId },
      };
    }
    case "projectUpdate": {
      const update = await ctx.db.get(sourceId as Id<"projectUpdates">);
      if (update === null || update.workspaceId !== workspaceId) return null;
      const project = await ctx.db.get(update.projectId);
      if (project === null || project.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: `Update on ${project.title}`,
        text: `Project update on "${project.title}":\n${update.body}`,
        anchor: projectUpdateAnchor(update),
        target: { page: "project", id: update.projectId },
      };
    }
    case "event": {
      const event = await ctx.db.get(sourceId as Id<"calendarEvents">);
      if (event === null || event.workspaceId !== workspaceId) return null;
      if (!canReadEvent(event, userId)) throw new RagForbiddenError();
      return {
        sourceType,
        sourceId,
        title: event.title,
        text: eventText(event),
        anchor: eventAnchor(event),
        target: { page: "event", id: sourceId },
      };
    }
    case "docs":
      // Static product docs are indexed by the Next.js worker from repo
      // Markdown, not from Convex tables. There is no per-record source.
      throw new RagNotFoundError("Docs sources are managed by the index worker");
  }
}

/**
 * Index-scoped reader for the worker: workspace scope is enforced, but
 * per-user private visibility is NOT — the index stores everything and
 * retrieval re-checks canRead at query time. The worker never returns
 * content to the triggering caller, only counts.
 */
export async function readCanonicalSourceForIndex(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
): Promise<CanonicalSource | null> {
  switch (sourceType) {
    case "task": {
      const task = await ctx.db.get(sourceId as Id<"tasks">);
      if (task === null || task.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: task.title,
        text: taskText(task),
        anchor: taskAnchor(task),
        target: { page: "task", id: sourceId },
      };
    }
    case "taskComment": {
      const comment = await ctx.db.get(sourceId as Id<"taskComments">);
      if (comment === null || comment.workspaceId !== workspaceId) return null;
      const task = await ctx.db.get(comment.taskId);
      if (task === null || task.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: `Comment on ${task.title}`,
        text: `Comment on task "${task.title}" (task#${task.number}):\n${comment.body}`,
        anchor: commentAnchor(comment),
        target: { page: "task", id: task._id },
      };
    }
    case "project": {
      const project = await ctx.db.get(sourceId as Id<"projects">);
      if (project === null || project.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: project.title,
        text: projectText(project),
        anchor: projectAnchor(project),
        target: { page: "project", id: sourceId },
      };
    }
    case "projectUpdate": {
      const update = await ctx.db.get(sourceId as Id<"projectUpdates">);
      if (update === null || update.workspaceId !== workspaceId) return null;
      const project = await ctx.db.get(update.projectId);
      if (project === null || project.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: `Update on ${project.title}`,
        text: `Project update on "${project.title}":\n${update.body}`,
        anchor: projectUpdateAnchor(update),
        target: { page: "project", id: update.projectId },
      };
    }
    case "event": {
      const event = await ctx.db.get(sourceId as Id<"calendarEvents">);
      if (event === null || event.workspaceId !== workspaceId) return null;
      return {
        sourceType,
        sourceId,
        title: event.title,
        text: eventText(event),
        anchor: eventAnchor(event),
        target: { page: "event", id: sourceId },
      };
    }
    case "docs":
      throw new RagNotFoundError("Docs sources are managed by the index worker");
  }
}

export async function getRagDocument(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
) {
  return await ctx.db
    .query("ragDocuments")
    .withIndex("by_workspace_source", (q) =>
      q.eq("workspaceId", workspaceId).eq("sourceType", sourceType).eq("sourceId", sourceId),
    )
    .unique();
}

export async function listActiveChunksForSource(
  ctx: DbCtx,
  documentId: Id<"ragDocuments">,
) {
  return await ctx.db
    .query("ragChunks")
    .withIndex("by_document", (q) => q.eq("documentId", documentId))
    .collect();
}

export async function getWorkspaceRagState(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  return await ctx.db
    .query("ragWorkspaceState")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .unique();
}

export type RagStatusError = {
  sourceType: string;
  sourceId: string;
  error: string;
};

export type RagStatusDto = {
  workspaceId: Id<"workspaces">;
  indexVersion: number;
  embeddingModel: string;
  embeddingVersion: string;
  pendingCount: number;
  completeCount: number;
  failedCount: number;
  chunkCount: number;
  updatedAt: string | null;
  recentErrors: RagStatusError[];
};

export async function ragStatusDto(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  embeddingModel: string,
  embeddingVersion: string,
): Promise<RagStatusDto> {
  const state = await getWorkspaceRagState(ctx, workspaceId);
  const docs = await ctx.db
    .query("ragDocuments")
    .withIndex("by_workspace_status", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  let completeCount = 0;
  let failedCount = 0;
  let chunkCount = 0;
  const recentErrors: RagStatusError[] = [];
  for (const doc of docs) {
    if (doc.indexStatus === "complete") {
      completeCount += 1;
      chunkCount += doc.chunkCount;
    } else if (doc.indexStatus === "failed") {
      failedCount += 1;
      if (recentErrors.length < 5 && doc.error) {
        recentErrors.push({
          sourceType: doc.sourceType,
          sourceId: doc.sourceId,
          error: doc.error,
        });
      }
    }
  }
  return {
    workspaceId,
    indexVersion: state?.indexVersion ?? 1,
    embeddingModel: state?.embeddingModel ?? embeddingModel,
    embeddingVersion: state?.embeddingVersion ?? embeddingVersion,
    pendingCount: state?.pendingCount ?? 0,
    completeCount,
    failedCount,
    chunkCount,
    updatedAt: state ? new Date(state.updatedAt).toISOString() : null,
    recentErrors,
  };
}
