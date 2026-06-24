import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

/**
 * TaskLabs data model.
 *
 * `authTables` (from Convex Auth) provides `users`, `authSessions`,
 * `authAccounts`, `authVerificationCodes`, etc. — do not redefine those.
 *
 * The app tables below carry the Convex port of the TaskLabs backend domains.
 * Keep protected data scoped by workspace membership in function/service code.
 */
export default defineSchema({
  ...authTables,

  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    platformRole: v.optional(v.union(v.literal("ADMIN"), v.literal("MEMBER"))),
    telegramBotToken: v.optional(v.string()),
    telegramBotTokenSuffix: v.optional(v.string()),
    telegramChatId: v.optional(v.string()),
    telegramWebhookSecret: v.optional(v.string()),
    notifyLeadMinutesTask: v.optional(v.array(v.number())),
    notifyLeadMinutesEvent: v.optional(v.array(v.number())),
    notifyLeadCustomTask: v.optional(v.boolean()),
    notifyLeadCustomEvent: v.optional(v.boolean()),
    themePreference: v.optional(
      v.union(v.literal("LIGHT"), v.literal("DARK"), v.literal("SYSTEM")),
    ),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("by_platform_role", ["platformRole"]),

  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    isPersonal: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.union(v.literal("OWNER"), v.literal("ADMIN"), v.literal("MEMBER")),
    joinedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"])
    .index("by_workspace_user", ["workspaceId", "userId"]),

  tasks: defineTable({
    workspaceId: v.id("workspaces"),
    creatorId: v.id("users"),
    number: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("BACKLOG"),
      v.literal("TODO"),
      v.literal("IN_PROGRESS"),
      v.literal("IN_REVIEW"),
      v.literal("DONE"),
      v.literal("CANCELLED"),
      v.literal("ARCHIVED"),
    ),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),
    dueDate: v.optional(v.number()), // epoch ms
    completedAt: v.optional(v.number()),
    position: v.number(), // kanban ordering within a status column
    isPrivate: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_number", ["workspaceId", "number"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_due_date", ["workspaceId", "dueDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId"],
    }),

  taskAssignees: defineTable({
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    userId: v.id("users"),
    assignedAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_user", ["userId"])
    .index("by_task_user", ["taskId", "userId"])
    .index("by_workspace", ["workspaceId"]),

  labels: defineTable({
    workspaceId: v.id("workspaces"),
    name: v.string(),
    color: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_name", ["workspaceId", "name"]),

  taskLabels: defineTable({
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    labelId: v.id("labels"),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_label", ["labelId"])
    .index("by_task_label", ["taskId", "labelId"])
    .index("by_workspace", ["workspaceId"]),

  calendarEvents: defineTable({
    workspaceId: v.id("workspaces"),
    creatorId: v.id("users"),
    title: v.string(),
    description: v.optional(v.string()),
    startAt: v.number(),
    endAt: v.number(),
    allDay: v.boolean(),
    color: v.optional(v.string()),
    location: v.optional(v.string()),
    isPrivate: v.boolean(),
    rrule: v.optional(v.string()),
    recurrenceParentId: v.optional(v.id("calendarEvents")),
    status: v.union(
      v.literal("SCHEDULED"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
    ),
    completedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_start", ["workspaceId", "startAt"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId"],
    }),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("TASK_ASSIGNED"),
      v.literal("TASK_UPDATED"),
      v.literal("TASK_DUE_SOON"),
      v.literal("EVENT_SOON"),
      v.literal("EVENT_STARTED"),
      v.literal("EVENT_COMPLETED"),
      v.literal("INVITE_ACCEPTED"),
      v.literal("MENTION"),
      v.literal("SYSTEM"),
    ),
    payload: v.any(),
    readAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_readAt", ["userId", "readAt"]),

  invitations: defineTable({
    email: v.string(),
    tokenHash: v.string(),
    workspaceId: v.id("workspaces"),
    invitedById: v.id("users"),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_workspace", ["workspaceId"])
    .index("by_email_workspace", ["email", "workspaceId"]),

  systemSettings: defineTable({
    key: v.string(),
    allowPublicRegistration: v.boolean(),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  apiKeys: defineTable({
    userId: v.id("users"),
    workspaceId: v.id("workspaces"),
    name: v.string(),
    prefix: v.string(),
    secretHash: v.string(),
    scopes: v.array(
      v.union(
        v.literal("tasks:read"),
        v.literal("tasks:write"),
        v.literal("events:read"),
        v.literal("events:write"),
        v.literal("labels:read"),
        v.literal("labels:write"),
        v.literal("workspaces:read"),
        v.literal("workspaces:admin"),
        v.literal("members:read"),
        v.literal("members:admin"),
        v.literal("notifications:read"),
        v.literal("notifications:write"),
        v.literal("search:read"),
        v.literal("profile:read"),
        v.literal("profile:write"),
        v.literal("telegram:read"),
        v.literal("telegram:test"),
        v.literal("system:read"),
        v.literal("system:write"),
      ),
    ),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_prefix", ["prefix"])
    .index("by_user_workspace", ["userId", "workspaceId"])
    .index("by_workspace_revoked", ["workspaceId", "revokedAt"])
    .index("by_prefix_revoked", ["prefix", "revokedAt"]),
});
