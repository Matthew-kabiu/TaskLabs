import { v } from "convex/values";
import { action, internalMutation, mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { apiKeyScope } from "./lib/validators";
import {
  createApiKey,
  listMyApiKeys,
  revokeApiKey,
  rotateApiKey,
  verifyApiKeyToken,
} from "./apiKeys/service";
import type { ApiKeyActor } from "./apiKeys/model";
import { assertRequiredScopes, type ApiKeyScope } from "./apiKeys/scopes";
import {
  createTaskForActor,
  getTaskForActor,
  listTasksForActor,
  removeTaskForActor,
  removeTasksForActor,
  reorderTasksForActor,
  updateTaskForActor,
} from "./tasks/service";
import {
  createEventForActor,
  getEventForActor,
  listEventsForActor,
  removeEventForActor,
  setEventCompletionForActor,
  updateEventForActor,
} from "./events/service";
import {
  createLabelForActor,
  listLabelsForActor,
  removeLabelForActor,
  updateLabelForActor,
} from "./labels/service";
import {
  addProjectUpdateForActor,
  createProjectForActor,
  getProjectForActor,
  listProjectUpdatesForActor,
  listProjectsForActor,
  removeProjectForActor,
  removeProjectUpdateForActor,
  setProjectFavoriteForActor,
  updateProjectForActor,
} from "./projects/service";
import {
  getWorkspaceForActor,
  listMembersForActor,
  removeMemberForActor,
  updateMemberRoleForActor,
} from "./workspaces/service";
import {
  listForActor,
  markAllReadForActor,
  markReadForActor,
  unreadCountForActor,
} from "./notifications/service";
import { searchWorkspaceForActor } from "./search";
import { normalizeLeadMinutes, normalizeName, userDto } from "./lib/users";
import { getTelegramUser, telegramSummaryDto } from "./telegram/model";
import { telegramApiOrigin } from "./telegram/env";

const internalApi = internal as any;

const TASK_STATUSES = [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "IN_REVIEW",
  "DONE",
  "CANCELLED",
  "ARCHIVED",
] as const;
const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const MCP_TOOL_SCOPES: Record<string, ApiKeyScope[]> = {
  "tasks.list": ["tasks:read"],
  "tasks.get": ["tasks:read"],
  "tasks.create": ["tasks:write"],
  "tasks.update": ["tasks:write"],
  "tasks.delete": ["tasks:write"],
  "tasks.deleteMany": ["tasks:write"],
  "tasks.reorder": ["tasks:write"],
  "projects.list": ["projects:read"],
  "projects.get": ["projects:read"],
  "projects.create": ["projects:write"],
  "projects.update": ["projects:write"],
  "projects.delete": ["projects:write"],
  "projects.favorite": ["projects:write"],
  "projects.updates.list": ["projects:read"],
  "projects.updates.create": ["projects:write"],
  "projects.updates.delete": ["projects:write"],
  "events.list": ["events:read"],
  "events.get": ["events:read"],
  "events.create": ["events:write"],
  "events.update": ["events:write"],
  "events.delete": ["events:write"],
  "events.complete": ["events:write"],
  "labels.list": ["labels:read"],
  "labels.create": ["labels:write"],
  "labels.update": ["labels:write"],
  "labels.delete": ["labels:write"],
  "workspaces.list": ["workspaces:read"],
  "workspaces.get": ["workspaces:read"],
  "workspaces.members.list": ["members:read"],
  "workspaces.members.update": ["members:admin"],
  "workspaces.members.remove": ["members:admin"],
  "notifications.list": ["notifications:read"],
  "notifications.unread": ["notifications:read"],
  "notifications.markRead": ["notifications:write"],
  "notifications.markAllRead": ["notifications:write"],
  "search.query": ["search:read"],
  "profile.get": ["profile:read"],
  "profile.update": ["profile:write"],
  "telegram.status": ["telegram:read"],
  "telegram.test": ["telegram:test"],
};

function requiredScopesForTool(toolName: string) {
  const scopes = MCP_TOOL_SCOPES[toolName];
  if (scopes === undefined) {
    throw new Error("Unknown MCP tool");
  }
  return scopes;
}

function record(input: unknown) {
  if (input === undefined || input === null) return {};
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Tool input must be an object");
  }
  return input as Record<string, unknown>;
}

function stringArg(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length < 1) {
    throw new Error(`${key} is required`);
  }
  return value;
}

function optionalString(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "number" ? value : undefined;
}

function optionalBoolean(input: Record<string, unknown>, key: string) {
  const value = input[key];
  return typeof value === "boolean" ? value : undefined;
}

function optionalEnum<const T extends readonly string[]>(
  input: Record<string, unknown>,
  key: string,
  values: T,
  suffix = "",
): T[number] | undefined {
  const value = input[key];
  if (value === undefined) return undefined;
  if (typeof value === "string" && (values as readonly string[]).includes(value)) {
    return value as T[number];
  }
  throw new Error(`${key} must be one of ${values.join(", ")}${suffix}`);
}

function optionalTaskStatus(input: Record<string, unknown>) {
  return optionalEnum(
    input,
    "status",
    TASK_STATUSES,
    "; represent blocked work as BACKLOG plus a blocked label",
  );
}

function optionalTaskPriority(input: Record<string, unknown>) {
  return optionalEnum(input, "priority", TASK_PRIORITIES);
}

function idempotencyKeyArg(input: Record<string, unknown>) {
  const key = stringArg(input, "idempotencyKey");
  if (key.length > 128) {
    throw new Error("idempotencyKey must be at most 128 characters");
  }
  return key;
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value) ?? "undefined";
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  const object = value as Record<string, unknown>;
  return `{${Object.keys(object)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonicalJson(object[key])}`)
    .join(",")}}`;
}

function optionalStringOrNull(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function optionalTime(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (value === null) return null;
  if (typeof value === "string" || typeof value === "number") return value;
  return undefined;
}

function timeArg(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (
    (typeof value === "string" && value.trim().length > 0) ||
    (typeof value === "number" && Number.isFinite(value))
  ) {
    return value;
  }
  throw new Error(`${key} must be a timestamp string or number`);
}

function booleanArg(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

function optionalIds(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item): item is string => typeof item === "string")) {
    throw new Error(`${key} must contain only IDs`);
  }
  return value;
}

function optionalNumbers(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (!Array.isArray(value)) return undefined;
  if (!value.every((item): item is number => typeof item === "number")) {
    throw new Error(`${key} must contain only numbers`);
  }
  return value;
}

function optionalResources(input: Record<string, unknown>, key: string) {
  const value = input[key];
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const row = record(item);
    const label = optionalString(row, "label");
    const type = optionalString(row, "type");
    const url = optionalString(row, "url");
    if (label === undefined || type === undefined || url === undefined) {
      throw new Error(`${key} entries require label, type, and url`);
    }
    return { label, type, url };
  });
}

function optionalWorkspaceCheck(
  actor: ApiKeyActor,
  input: Record<string, unknown>,
) {
  const requested = input.workspaceId;
  if (requested !== undefined && requested !== actor.workspaceId) {
    throw new Error("API key is scoped to a different workspace");
  }
}

function roleArg(value: unknown) {
  if (value === "OWNER" || value === "ADMIN" || value === "MEMBER") {
    return value;
  }
  throw new Error("role must be OWNER, ADMIN, or MEMBER");
}

async function postTelegramJson(
  token: string,
  method: string,
  body: Record<string, unknown>,
) {
  const response = await fetch(
    `${telegramApiOrigin()}/bot${encodeURIComponent(token)}/${method}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!response.ok) {
    throw new Error("Telegram request failed");
  }
  return await response.json().catch(() => ({}));
}

export const list = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => await listMyApiKeys(ctx, args.workspaceId),
});

export const create = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    name: v.string(),
    scopes: v.array(apiKeyScope),
    expiresAt: v.optional(v.union(v.number(), v.string(), v.null())),
  },
  handler: async (ctx, args) => await createApiKey(ctx, args),
});

export const revoke = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => await revokeApiKey(ctx, args.keyId),
});

export const rotate = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => await rotateApiKey(ctx, args.keyId),
});

export const verifyBearer = mutation({
  args: {
    token: v.string(),
    requiredScopes: v.optional(v.array(apiKeyScope)),
  },
  handler: async (ctx, args) =>
    await verifyApiKeyToken(ctx, args.token, args.requiredScopes),
});

export const verifyBearerInternal = internalMutation({
  args: {
    token: v.string(),
    requiredScopes: v.optional(v.array(apiKeyScope)),
  },
  handler: async (ctx, args) =>
    await verifyApiKeyToken(ctx, args.token, args.requiredScopes),
});

export const mcpDispatchMutation = internalMutation({
  args: {
    token: v.string(),
    toolName: v.string(),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const actor = await verifyApiKeyToken(ctx, args.token);
    assertRequiredScopes(actor.scopes, requiredScopesForTool(args.toolName));
    const input = record(args.input);
    optionalWorkspaceCheck(actor, input);

    switch (args.toolName) {
      case "tasks.list":
        return await listTasksForActor(ctx, actor.workspaceId, actor.userId, {
          status: optionalTaskStatus(input),
          priority: optionalTaskPriority(input),
          q: optionalString(input, "q"),
          sort: optionalString(input, "sort") as any,
          dueFrom: optionalTime(input, "dueFrom") ?? undefined,
          dueTo: optionalTime(input, "dueTo") ?? undefined,
          projectId: optionalStringOrNull(input, "projectId") as
            | Id<"projects">
            | null
            | undefined,
        }, true);
      case "tasks.get":
        return await getTaskForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "taskId") as Id<"tasks">,
          true,
        );
      case "tasks.create": {
        const idempotencyKey = idempotencyKeyArg(input);
        const createInput = {
          title: stringArg(input, "title"),
          description: optionalString(input, "description"),
          status: optionalTaskStatus(input),
          priority: optionalTaskPriority(input),
          dueDate: optionalTime(input, "dueDate") ?? undefined,
          isPrivate: optionalBoolean(input, "isPrivate"),
          position: optionalNumber(input, "position"),
          assigneeIds: optionalIds(input, "assigneeIds") as
            | Id<"users">[]
            | undefined,
          labelIds: optionalIds(input, "labelIds") as
            | Id<"labels">[]
            | undefined,
          projectId: optionalString(input, "projectId") as
            | Id<"projects">
            | undefined,
        };
        const inputFingerprint = canonicalJson(createInput);
        const existing = await ctx.db
          .query("mcpIdempotency")
          .withIndex("by_api_key_operation_key", (q) =>
            q
              .eq("apiKeyId", actor.apiKeyId)
              .eq("operation", args.toolName)
              .eq("key", idempotencyKey),
          )
          .unique();
        if (existing !== null) {
          if (existing.inputFingerprint !== inputFingerprint) {
            throw new Error(
              "idempotencyKey was already used with different task input",
            );
          }
          return await getTaskForActor(
            ctx,
            actor.workspaceId,
            actor.userId,
            existing.taskId,
            true,
          );
        }

        const task = await createTaskForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          createInput,
          true,
        );
        await ctx.db.insert("mcpIdempotency", {
          apiKeyId: actor.apiKeyId,
          workspaceId: actor.workspaceId,
          operation: args.toolName,
          key: idempotencyKey,
          inputFingerprint,
          taskId: task.id,
          createdAt: Date.now(),
        });
        return task;
      }
      case "tasks.update":
        return await updateTaskForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "taskId") as Id<"tasks">,
          {
            title: optionalString(input, "title"),
            description: optionalStringOrNull(input, "description"),
            status: optionalTaskStatus(input),
            priority: optionalTaskPriority(input),
            dueDate: optionalTime(input, "dueDate"),
            completedAt: optionalTime(input, "completedAt"),
            isPrivate: optionalBoolean(input, "isPrivate"),
            position: optionalNumber(input, "position"),
            assigneeIds: optionalIds(input, "assigneeIds") as
              | Id<"users">[]
              | undefined,
            labelIds: optionalIds(input, "labelIds") as
              | Id<"labels">[]
              | undefined,
            projectId: optionalStringOrNull(input, "projectId") as
              | Id<"projects">
              | null
              | undefined,
          },
          true,
        );
      case "tasks.delete":
        return await removeTaskForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "taskId") as Id<"tasks">,
          true,
        );
      case "tasks.deleteMany": {
        const taskIds = input.taskIds;
        if (!Array.isArray(taskIds)) throw new Error("taskIds is required");
        if (!taskIds.every((item): item is string => typeof item === "string")) {
          throw new Error("taskIds must contain only IDs");
        }
        return await removeTasksForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          taskIds as Id<"tasks">[],
          true,
        );
      }
      case "tasks.reorder": {
        const items = input.items;
        if (!Array.isArray(items)) throw new Error("items is required");
        return await reorderTasksForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          items.map((item) => {
            const row = record(item);
            if (typeof row.position !== "number" || !Number.isFinite(row.position)) {
              throw new Error("position must be a finite number");
            }
            return {
              id: stringArg(row, "id") as Id<"tasks">,
              position: row.position,
            };
          }),
true,
        );
      }
      case "projects.list":
        return await listProjectsForActor(ctx, actor.workspaceId, actor.userId, {
          status: optionalString(input, "status") as any,
          priority: optionalString(input, "priority") as any,
          q: optionalString(input, "q"),
        }, true);
      case "projects.get":
        return await getProjectForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          true,
        );
      case "projects.create":
        return await createProjectForActor(ctx, actor.workspaceId, actor.userId, {
          title: stringArg(input, "title"),
          description: optionalString(input, "description"),
          status: optionalString(input, "status") as any,
          priority: optionalString(input, "priority") as any,
           memberIds: optionalIds(input, "memberIds") as Id<"users">[] | undefined,
           leadId: optionalString(input, "leadId") as Id<"users"> | undefined,
          startDate: optionalTime(input, "startDate") ?? undefined,
          endDate: optionalTime(input, "endDate") ?? undefined,
          resources: optionalResources(input, "resources") as any,
        }, true);
      case "projects.update":
        return await updateProjectForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          {
            title: optionalString(input, "title"),
            description: optionalStringOrNull(input, "description"),
            status: optionalString(input, "status") as any,
            priority: optionalString(input, "priority") as any,
             memberIds: optionalIds(input, "memberIds") as Id<"users">[] | undefined,
             leadId: optionalString(input, "leadId") as Id<"users"> | undefined,
            startDate: optionalTime(input, "startDate"),
            endDate: optionalTime(input, "endDate"),
            resources: optionalResources(input, "resources") as any,
          },
          true,
        );
      case "projects.delete":
        return await removeProjectForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          true,
        );
      case "projects.favorite":
        return await setProjectFavoriteForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          booleanArg(input, "isFavorite"),
          true,
        );
      case "projects.updates.list":
        return await listProjectUpdatesForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          true,
        );
      case "projects.updates.create":
        return await addProjectUpdateForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          stringArg(input, "body"),
          true,
        );
      case "projects.updates.delete":
        return await removeProjectUpdateForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "projectId") as Id<"projects">,
          stringArg(input, "updateId") as Id<"projectUpdates">,
          true,
        );
      case "events.list":
        return await listEventsForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          { from: timeArg(input, "from"), to: timeArg(input, "to") },
          true,
        );
      case "events.get":
        return await getEventForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "eventId") as Id<"calendarEvents">,
          true,
        );
      case "events.create":
        return await createEventForActor(ctx, actor.workspaceId, actor.userId, {
          title: stringArg(input, "title"),
          description: optionalStringOrNull(input, "description"),
          startAt: timeArg(input, "startAt"),
          endAt: timeArg(input, "endAt"),
          allDay: optionalBoolean(input, "allDay"),
          color: optionalStringOrNull(input, "color"),
          location: optionalStringOrNull(input, "location"),
          isPrivate: optionalBoolean(input, "isPrivate"),
          rrule: optionalStringOrNull(input, "rrule"),
        }, true);
      case "events.update":
        return await updateEventForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "eventId") as Id<"calendarEvents">,
          {
            title: optionalString(input, "title"),
            description: optionalStringOrNull(input, "description"),
            startAt: optionalTime(input, "startAt") ?? undefined,
            endAt: optionalTime(input, "endAt") ?? undefined,
            allDay: optionalBoolean(input, "allDay"),
            color: optionalStringOrNull(input, "color"),
            location: optionalStringOrNull(input, "location"),
            isPrivate: optionalBoolean(input, "isPrivate"),
            rrule: optionalStringOrNull(input, "rrule"),
            status: optionalString(input, "status") as any,
            completedAt: optionalTime(input, "completedAt"),
          },
          true,
        );
      case "events.delete":
        return await removeEventForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "eventId") as Id<"calendarEvents">,
          true,
        );
      case "events.complete":
        return await setEventCompletionForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "eventId") as Id<"calendarEvents">,
          booleanArg(input, "completed"),
          true,
        );
      case "labels.list":
        return await listLabelsForActor(ctx, actor.workspaceId, actor.userId);
      case "labels.create":
        return await createLabelForActor(ctx, actor.workspaceId, actor.userId, {
          name: stringArg(input, "name"),
          color: stringArg(input, "color"),
        });
      case "labels.update":
        return await updateLabelForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "labelId") as Id<"labels">,
          {
            name: optionalString(input, "name"),
            color: optionalString(input, "color"),
          },
        );
      case "labels.delete":
        return await removeLabelForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "labelId") as Id<"labels">,
        );
      case "workspaces.list": {
        const workspace = await getWorkspaceForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
        );
        return workspace === null ? [] : [workspace];
      }
      case "workspaces.get":
        return await getWorkspaceForActor(ctx, actor.workspaceId, actor.userId);
      case "workspaces.members.list":
        return await listMembersForActor(ctx, actor.workspaceId, actor.userId);
      case "workspaces.members.update":
        return await updateMemberRoleForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          undefined,
          stringArg(input, "userId") as Id<"users">,
          roleArg(input.role),
        );
      case "workspaces.members.remove":
        return await removeMemberForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          undefined,
          stringArg(input, "userId") as Id<"users">,
        );
      case "notifications.list":
        return await listForActor(
          ctx,
          actor.userId,
          optionalNumber(input, "limit"),
        );
      case "notifications.unread":
        return await unreadCountForActor(ctx, actor.userId);
      case "notifications.markRead":
        return await markReadForActor(
          ctx,
          actor.userId,
          stringArg(input, "notificationId") as Id<"notifications">,
        );
      case "notifications.markAllRead":
        return await markAllReadForActor(ctx, actor.userId);
      case "search.query":
        return await searchWorkspaceForActor(
          ctx,
          actor.workspaceId,
          actor.userId,
          stringArg(input, "q"),
          optionalNumber(input, "limit"),
          true,
        );
      case "profile.get":
        return await userDto(ctx, actor.userId);
      case "profile.update": {
        const patch: {
          name?: string;
          themePreference?: "LIGHT" | "DARK" | "SYSTEM";
          notifyLeadMinutesTask?: number[];
          notifyLeadMinutesEvent?: number[];
          notifyLeadCustomTask?: boolean;
          notifyLeadCustomEvent?: boolean;
        } = {};
        if (input.name !== undefined) {
          if (typeof input.name !== "string") throw new Error("name must be a string");
          patch.name = normalizeName(input.name);
        }
        if (
          input.themePreference === "LIGHT" ||
          input.themePreference === "DARK" ||
          input.themePreference === "SYSTEM"
        ) {
          patch.themePreference = input.themePreference;
        } else if (input.themePreference !== undefined) {
          throw new Error("themePreference must be LIGHT, DARK, or SYSTEM");
        }
        const taskLeads = normalizeLeadMinutes(
          optionalNumbers(input, "notifyLeadMinutesTask"),
        );
        if (taskLeads !== undefined) patch.notifyLeadMinutesTask = taskLeads;
        const eventLeads = normalizeLeadMinutes(
          optionalNumbers(input, "notifyLeadMinutesEvent"),
        );
        if (eventLeads !== undefined) patch.notifyLeadMinutesEvent = eventLeads;
        if (input.notifyLeadCustomTask !== undefined) {
          patch.notifyLeadCustomTask = booleanArg(input, "notifyLeadCustomTask");
        }
        if (input.notifyLeadCustomEvent !== undefined) {
          patch.notifyLeadCustomEvent = booleanArg(input, "notifyLeadCustomEvent");
        }
        await ctx.db.patch(actor.userId, patch);
        return await userDto(ctx, actor.userId);
      }
      case "telegram.status":
        return telegramSummaryDto(await getTelegramUser(ctx, actor.userId));
      default:
        throw new Error("Unknown MCP tool");
    }
  },
});

export const mcpDispatch = action({
  args: {
    token: v.string(),
    toolName: v.string(),
    input: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    if (args.toolName !== "telegram.test") {
      return await ctx.runMutation(internalApi.apiKeys.mcpDispatchMutation, args);
    }

    const actor = await ctx.runMutation(internalApi.apiKeys.verifyBearerInternal, {
      token: args.token,
      requiredScopes: [],
    });
    assertRequiredScopes(actor.scopes, requiredScopesForTool(args.toolName));
    const config = await ctx.runQuery(internalApi.telegram.getSendConfig, {
      userId: actor.userId,
    });
    if (config?.token === undefined) {
      throw new Error("No bot token saved");
    }
    if (config.chatId === undefined) {
      throw new Error("Bot not linked: send /start to your bot first");
    }
    await postTelegramJson(config.token, "sendMessage", {
      chat_id: config.chatId,
      text: "<b>TaskLabs test</b> - your bot is connected.",
      parse_mode: "HTML",
    });
    await ctx.runMutation(internalApi.notifications.createForUser, {
      userId: actor.userId,
      type: "SYSTEM",
      payload: { message: "TaskLabs test - your bot is connected." },
    });
    return { ok: true };
  },
});
