import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembership, requireMembershipForUser } from "../lib/auth";
import type { TaskPriority, TaskSort, TaskStatus } from "./model";
import {
  canReadTask,
  deleteTaskRelations,
  getNextTaskNumber,
  getNextTaskPosition,
  getTaskInWorkspace,
  getVisibleTaskInWorkspace,
  listTaskAssigneeRows,
  listTaskRecords,
  normalizeDescription,
  normalizeTaskTitle,
  parseOptionalTime,
  sortTasks,
  taskDto,
  taskRelationsDto,
  TaskForbiddenError,
} from "./model";
import { createNotificationRecord } from "../notifications/model";

export type ListTaskFilters = {
  status?: TaskStatus;
  priority?: TaskPriority;
  q?: string;
  sort?: TaskSort;
  dueFrom?: number | string;
  dueTo?: number | string;
  projectId?: Id<"projects"> | null;
};

export type CreateTaskInput = {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number | string;
  isPrivate?: boolean;
  position?: number;
  assigneeIds?: Id<"users">[];
  labelIds?: Id<"labels">[];
  projectId?: Id<"projects">;
};

export type UpdateTaskInput = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: number | string | null;
  completedAt?: number | string | null;
  isPrivate?: boolean;
  position?: number;
  assigneeIds?: Id<"users">[];
  labelIds?: Id<"labels">[];
  projectId?: Id<"projects"> | null;
};

function ensureFinitePosition(position: number) {
  if (!Number.isFinite(position)) {
    throw new Error("Task position must be finite");
  }
  return position;
}

function uniqueIds<T extends string>(ids: T[] | undefined) {
  if (ids === undefined) return undefined;
  return [...new Set(ids)];
}

async function validateAssignees(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  assigneeIds: Id<"users">[] | undefined,
) {
  const ids = uniqueIds(assigneeIds);
  if (ids === undefined) return undefined;
  for (const userId of ids) {
    const membership = await ctx.db
      .query("workspaceMembers")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", workspaceId).eq("userId", userId),
      )
      .unique();
    if (membership === null) {
      throw new Error("Task assignee must be a workspace member");
    }
  }
  return ids;
}

async function validateLabels(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  labelIds: Id<"labels">[] | undefined,
) {
  const ids = uniqueIds(labelIds);
  if (ids === undefined) return undefined;
  for (const labelId of ids) {
    const label = await ctx.db.get(labelId);
    if (label === null || label.workspaceId !== workspaceId) {
      throw new Error("Task label must belong to the workspace");
    }
  }
  return ids;
}

async function validateProjectId(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  projectId: Id<"projects"> | null | undefined,
) {
  if (projectId === undefined || projectId === null) {
    return undefined;
  }
  const project = await ctx.db.get(projectId);
  if (project === null || project.workspaceId !== workspaceId) {
    throw new Error("Task project must belong to the workspace");
  }
  return projectId;
}

async function replaceAssignees(
  ctx: MutationCtx,
  input: {
    workspaceId: Id<"workspaces">;
    taskId: Id<"tasks">;
    assigneeIds: Id<"users">[];
    actorId: Id<"users">;
    taskTitle: string;
  },
) {
  const existing = await listTaskAssigneeRows(ctx, input.taskId);
  const desired = new Set(input.assigneeIds);
  const existingSet = new Set(existing.map((row) => row.userId));
  const now = Date.now();

  for (const row of existing) {
    if (!desired.has(row.userId)) {
      await ctx.db.delete(row._id);
    }
  }

  for (const userId of input.assigneeIds) {
    if (existingSet.has(userId)) continue;
    await ctx.db.insert("taskAssignees", {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      userId,
      assignedAt: now,
    });
    if (userId !== input.actorId) {
      await createNotificationRecord(ctx, {
        userId,
        type: "TASK_ASSIGNED",
        payload: {
          taskId: input.taskId,
          title: input.taskTitle,
          workspaceId: input.workspaceId,
          actorId: input.actorId,
        },
        now,
      });
    }
  }
}

async function replaceLabels(
  ctx: MutationCtx,
  input: {
    workspaceId: Id<"workspaces">;
    taskId: Id<"tasks">;
    labelIds: Id<"labels">[];
  },
) {
  const existing = await ctx.db
    .query("taskLabels")
    .withIndex("by_task", (q) => q.eq("taskId", input.taskId))
    .collect();
  const desired = new Set(input.labelIds);
  const existingSet = new Set(existing.map((row) => row.labelId));
  const now = Date.now();

  for (const row of existing) {
    if (!desired.has(row.labelId)) {
      await ctx.db.delete(row._id);
    }
  }

  for (const labelId of input.labelIds) {
    if (existingSet.has(labelId)) continue;
    await ctx.db.insert("taskLabels", {
      workspaceId: input.workspaceId,
      taskId: input.taskId,
      labelId,
      createdAt: now,
    });
  }
}

async function taskWithRelations(ctx: QueryCtx | MutationCtx, task: { _id: Id<"tasks"> } & Parameters<typeof taskDto>[0]) {
  return taskDto(task, await taskRelationsDto(ctx, task._id));
}

export async function listTasks(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  filters: ListTaskFilters,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await listTasksForActor(ctx, workspaceId, userId, filters, true);
}

export async function listTasksForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  filters: ListTaskFilters,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const dueFrom = parseOptionalTime(filters.dueFrom);
  const dueTo = parseOptionalTime(filters.dueTo);
  const q = filters.q?.trim().toLowerCase();

  const tasks = (await listTaskRecords(ctx, workspaceId)).filter((task) => {
    if (!canReadTask(task, userId)) return false;
    if (filters.status !== undefined && task.status !== filters.status) return false;
    if (filters.priority !== undefined && task.priority !== filters.priority) return false;
    if (filters.projectId !== undefined) {
      const taskProject = task.projectId ?? null;
      if (taskProject !== filters.projectId) return false;
    }
    if (dueFrom !== undefined && (task.dueDate ?? 0) < dueFrom) return false;
    if (dueTo !== undefined && (task.dueDate ?? Number.POSITIVE_INFINITY) > dueTo) {
      return false;
    }
    if (q !== undefined && q.length > 0) {
      const haystack = `${task.title}\n${task.description ?? ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  return await Promise.all(
    sortTasks(tasks, filters.sort ?? "manual").map((task) =>
      taskWithRelations(ctx, task),
    ),
  );
}

export async function getTask(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await getTaskForActor(ctx, workspaceId, userId, taskId, true);
}

export async function getTaskForActor(
  ctx: QueryCtx | MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const task = await getVisibleTaskInWorkspace(ctx, workspaceId, userId, taskId);
  return await taskWithRelations(ctx, task);
}

export async function createTask(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  input: CreateTaskInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await createTaskForActor(ctx, workspaceId, userId, input, true);
}

export async function createTaskForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  input: CreateTaskInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const assigneeIds = await validateAssignees(ctx, workspaceId, input.assigneeIds);
  const labelIds = await validateLabels(ctx, workspaceId, input.labelIds);
  const projectId = await validateProjectId(ctx, workspaceId, input.projectId);

  const status = input.status ?? "TODO";
  const now = Date.now();
  const position =
    input.position === undefined
      ? await getNextTaskPosition(ctx, workspaceId, status)
      : ensureFinitePosition(input.position);

  const taskId = await ctx.db.insert("tasks", {
    workspaceId,
    creatorId: userId,
    number: await getNextTaskNumber(ctx, workspaceId),
    title: normalizeTaskTitle(input.title),
    description: normalizeDescription(input.description),
    status,
    priority: input.priority ?? "MEDIUM",
    dueDate: parseOptionalTime(input.dueDate),
    position,
    isPrivate: input.isPrivate ?? false,
    projectId,
    createdAt: now,
    updatedAt: now,
  });

  const task = await ctx.db.get(taskId);
  if (task === null) {
    throw new Error("Task not found after create");
  }
  if (assigneeIds !== undefined) {
    await replaceAssignees(ctx, {
      workspaceId,
      taskId,
      assigneeIds,
      actorId: userId,
      taskTitle: task.title,
    });
  }
  if (labelIds !== undefined) {
    await replaceLabels(ctx, { workspaceId, taskId, labelIds });
  }
  return await taskWithRelations(ctx, task);
}

export async function updateTask(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
  input: UpdateTaskInput,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await updateTaskForActor(ctx, workspaceId, userId, taskId, input, true);
}

export async function updateTaskForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  input: UpdateTaskInput,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const assigneeIds = await validateAssignees(ctx, workspaceId, input.assigneeIds);
  const labelIds = await validateLabels(ctx, workspaceId, input.labelIds);
  const projectId = await validateProjectId(ctx, workspaceId, input.projectId);

  const existing = await getTaskInWorkspace(ctx, workspaceId, taskId);
  if (existing.isPrivate && existing.creatorId !== userId) {
    throw new TaskForbiddenError();
  }

  const patch: Partial<typeof existing> = {
    updatedAt: Date.now(),
  };

  if (input.title !== undefined) {
    patch.title = normalizeTaskTitle(input.title);
  }
  if (input.description !== undefined) {
    patch.description = normalizeDescription(input.description);
  }
  if (input.status !== undefined) {
    patch.status = input.status;
    if (input.status === "DONE" && existing.completedAt === undefined) {
      patch.completedAt = patch.updatedAt;
    }
    if (input.status !== "DONE" && existing.completedAt !== undefined) {
      patch.completedAt = undefined;
    }
  }
  if (input.priority !== undefined) {
    patch.priority = input.priority;
  }
  if (input.dueDate !== undefined) {
    patch.dueDate = parseOptionalTime(input.dueDate);
  }
  if (input.completedAt !== undefined) {
    patch.completedAt = parseOptionalTime(input.completedAt);
  }
  if (input.isPrivate !== undefined) {
    patch.isPrivate = input.isPrivate;
  }
  if (input.projectId === null) {
    patch.projectId = undefined;
  } else if (input.projectId !== undefined) {
    patch.projectId = projectId;
  }
  if (input.position !== undefined) {
    patch.position = ensureFinitePosition(input.position);
  }

  await ctx.db.patch(taskId, patch);

  const task = await ctx.db.get(taskId);
  if (task === null) {
    throw new Error("Task not found after update");
  }
  if (assigneeIds !== undefined) {
    await replaceAssignees(ctx, {
      workspaceId,
      taskId,
      assigneeIds,
      actorId: userId,
      taskTitle: task.title,
    });
  }
  if (labelIds !== undefined) {
    await replaceLabels(ctx, { workspaceId, taskId, labelIds });
  }
  return await taskWithRelations(ctx, task);
}

export async function removeTask(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskId: Id<"tasks">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeTaskForActor(ctx, workspaceId, userId, taskId, true);
}

export async function removeTaskForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskId: Id<"tasks">,
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const existing = await getTaskInWorkspace(ctx, workspaceId, taskId);
  if (existing.isPrivate && existing.creatorId !== userId) {
    throw new TaskForbiddenError();
  }
  await deleteTaskRelations(ctx, taskId);
  await ctx.db.delete(taskId);
  return null;
}

export async function removeTasks(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  taskIds: Id<"tasks">[],
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await removeTasksForActor(ctx, workspaceId, userId, taskIds, true);
}

export async function removeTasksForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  taskIds: Id<"tasks">[],
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const uniqueTaskIds = [...new Set(taskIds)];
  if (uniqueTaskIds.length < 1) {
    throw new Error("taskIds must contain at least one task");
  }
  if (uniqueTaskIds.length > 100) {
    throw new Error("Cannot delete more than 100 tasks at once");
  }

  // Validate the entire batch before deleting anything so authorization
  // failures cannot leave the workspace with a partially deleted selection.
  for (const taskId of uniqueTaskIds) {
    const task = await getTaskInWorkspace(ctx, workspaceId, taskId);
    if (task.isPrivate && task.creatorId !== userId) {
      throw new TaskForbiddenError();
    }
  }

  for (const taskId of uniqueTaskIds) {
    await deleteTaskRelations(ctx, taskId);
    await ctx.db.delete(taskId);
  }

  return { deleted: uniqueTaskIds.length };
}

export async function reorderTasks(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  items: { id: Id<"tasks">; position: number }[],
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  return await reorderTasksForActor(ctx, workspaceId, userId, items, true);
}

export async function reorderTasksForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  items: { id: Id<"tasks">; position: number }[],
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  if (items.length < 1) {
    throw new Error("items must contain at least one entry");
  }

  for (const item of items) {
    const task = await ctx.db.get(item.id);
    if (task === null || task.workspaceId !== workspaceId) {
      continue;
    }
    if (task.isPrivate && task.creatorId !== userId) {
      continue;
    }
    await ctx.db.patch(item.id, {
      position: ensureFinitePosition(item.position),
      updatedAt: Date.now(),
    });
  }

  return { ok: true };
}
