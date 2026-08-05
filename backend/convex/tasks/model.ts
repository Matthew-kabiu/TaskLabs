import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export type TaskStatus = Doc<"tasks">["status"];
export type TaskPriority = Doc<"tasks">["priority"];
export type TaskSort = "manual" | "dueDate" | "priority" | "createdAt" | "title";
export type TaskAssigneeDto = {
  id: Id<"users">;
  userId: Id<"users">;
  email: string | null;
  name: string | null;
};
export type TaskLabelDto = {
  id: Id<"labels">;
  name: string;
  color: string;
};

export class TaskNotFoundError extends Error {
  constructor(message = "Task not found") {
    super(message);
    this.name = "TaskNotFoundError";
  }
}

export class TaskForbiddenError extends Error {
  constructor(message = "Forbidden: private task") {
    super(message);
    this.name = "TaskForbiddenError";
  }
}

export function normalizeTaskTitle(title: string) {
  const trimmed = title.trim();
  if (trimmed.length < 1) {
    throw new Error("Task title is required");
  }
  if (trimmed.length > 200) {
    throw new Error("Task title must be at most 200 characters");
  }
  return trimmed;
}

export function normalizeDescription(description?: string | null) {
  if (description === undefined) {
    return undefined;
  }
  if (description === null) {
    return undefined;
  }
  if (description.length > 10_000) {
    throw new Error("Task description must be at most 10000 characters");
  }
  return description;
}

export function parseOptionalTime(value?: number | string | null) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new Error("Date value must be finite");
    }
    return value;
  }
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) {
    throw new Error("Date value must be an ISO date string or epoch milliseconds");
  }
  return parsed;
}

export function taskDto(
  task: Doc<"tasks">,
  relations?: {
    assignees?: TaskAssigneeDto[];
    labels?: TaskLabelDto[];
  },
) {
  return {
    id: task._id,
    number: task.number,
    workspaceId: task.workspaceId,
    creatorId: task.creatorId,
    projectId: task.projectId ?? null,
    title: task.title,
    description: task.description ?? null,
    status: task.status,
    priority: task.priority,
    dueDate: task.dueDate === undefined ? null : new Date(task.dueDate).toISOString(),
    completedAt:
      task.completedAt === undefined ? null : new Date(task.completedAt).toISOString(),
    isPrivate: task.isPrivate,
    position: task.position,
    assignees: relations?.assignees ?? [],
    labels: relations?.labels ?? [],
    createdAt: new Date(task.createdAt).toISOString(),
    updatedAt: new Date(task.updatedAt).toISOString(),
  };
}

export function canReadTask(task: Doc<"tasks">, userId: Id<"users">) {
  return !task.isPrivate || task.creatorId === userId;
}

export async function listTaskRecords(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  return await ctx.db
    .query("tasks")
    .withIndex("by_workspace", (q) => q.eq("workspaceId", workspaceId))
    .collect();
}

export async function listTaskAssigneeRows(
  ctx: DbCtx,
  taskId: Id<"tasks">,
) {
  return await ctx.db
    .query("taskAssignees")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
}

export async function listTaskLabelRows(ctx: DbCtx, taskId: Id<"tasks">) {
  return await ctx.db
    .query("taskLabels")
    .withIndex("by_task", (q) => q.eq("taskId", taskId))
    .collect();
}

export async function taskRelationsDto(ctx: DbCtx, taskId: Id<"tasks">) {
  const [assigneeRows, labelRows] = await Promise.all([
    listTaskAssigneeRows(ctx, taskId),
    listTaskLabelRows(ctx, taskId),
  ]);

  const assignees = await Promise.all(
    assigneeRows.map(async (row) => {
      const user = await ctx.db.get(row.userId);
      return {
        id: row.userId,
        userId: row.userId,
        email: user?.email ?? null,
        name: user?.name ?? null,
      };
    }),
  );
  const labels = await Promise.all(
    labelRows.map(async (row) => {
      const label = await ctx.db.get(row.labelId);
      return label === null
        ? null
        : { id: label._id, name: label.name, color: label.color };
    }),
  );

  return {
    assignees: assignees.sort((a, b) =>
      (a.name ?? a.email ?? "").localeCompare(b.name ?? b.email ?? ""),
    ),
    labels: labels
      .filter((label): label is TaskLabelDto => label !== null)
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export async function deleteTaskRelations(
  ctx: MutationCtx,
  taskId: Id<"tasks">,
) {
  const [assignees, labels] = await Promise.all([
    listTaskAssigneeRows(ctx, taskId),
    listTaskLabelRows(ctx, taskId),
  ]);
  for (const row of assignees) {
    await ctx.db.delete(row._id);
  }
  for (const row of labels) {
    await ctx.db.delete(row._id);
  }
}

export async function getTaskInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
) {
  const task = await ctx.db.get(taskId);
  if (task === null || task.workspaceId !== workspaceId) {
    throw new TaskNotFoundError();
  }
  return task;
}

export async function getVisibleTaskInWorkspace(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
) {
  const task = await getTaskInWorkspace(ctx, workspaceId, taskId);
  if (!canReadTask(task, userId)) {
    throw new TaskNotFoundError();
  }
  return task;
}

export async function getNextTaskNumber(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
) {
  const last = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_number", (q) => q.eq("workspaceId", workspaceId))
    .order("desc")
    .first();
  return (last?.number ?? 0) + 1;
}

export async function getNextTaskPosition(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  status: TaskStatus,
) {
  const tasks = await ctx.db
    .query("tasks")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("status", status),
    )
    .collect();
  return tasks.reduce((max, task) => Math.max(max, task.position), -1) + 1;
}

export function midpointPosition(before: number | null, after: number | null) {
  if (before === null && after === null) return 0;
  if (before === null) return after! - 1;
  if (after === null) return before + 1;
  return (before + after) / 2;
}

const PRIORITY_RANK: Record<TaskPriority, number> = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  URGENT: 3,
};

export function sortTasks(tasks: Doc<"tasks">[], sort: TaskSort) {
  return [...tasks].sort((a, b) => {
    switch (sort) {
      case "dueDate": {
        const left = a.dueDate ?? Number.POSITIVE_INFINITY;
        const right = b.dueDate ?? Number.POSITIVE_INFINITY;
        return left - right || a.position - b.position;
      }
      case "priority":
        return PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] || a.position - b.position;
      case "createdAt":
        return b.createdAt - a.createdAt;
      case "title":
        return a.title.localeCompare(b.title) || a.position - b.position;
      case "manual":
      default:
        return a.position - b.position || a.createdAt - b.createdAt;
    }
  });
}
