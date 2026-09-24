import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { citationArg } from './rag/conversationValidators';

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

  iceConversations: defineTable({
    workspaceId: v.id('workspaces'), userId: v.id('users'), generation: v.number(), updatedAt: v.number(),
  }).index('by_workspace_user', ['workspaceId', 'userId']),
  iceTurns: defineTable({
    conversationId: v.id('iceConversations'), generation: v.number(), requestId: v.string(),
    question: v.string(), mode: v.union(v.literal('ask'), v.literal('retrieve')),
    status: v.union(v.literal('pending'), v.literal('complete'), v.literal('error')),
    answer: v.optional(v.string()), citations: v.array(citationArg), empty: v.boolean(),
    error: v.optional(v.string()),
  }).index('by_conversation_generation', ['conversationId', 'generation'])
    .index('by_request', ['conversationId', 'generation', 'requestId']),

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
    // Optional project linkage. A task belongs to at most one project, or to
    // "no project" when undefined. Deleting a project cascades to its tasks.
    projectId: v.optional(v.id("projects")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_number", ["workspaceId", "number"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .index("by_workspace_due_date", ["workspaceId", "dueDate"])
    .index("by_workspace_project", ["workspaceId", "projectId"])
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

  taskComments: defineTable({
    workspaceId: v.id("workspaces"),
    taskId: v.id("tasks"),
    authorId: v.id("users"),
    body: v.string(),
    editedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_task", ["taskId"])
    .index("by_task_created", ["taskId", "createdAt"])
    .index("by_workspace", ["workspaceId"]),

  projects: defineTable({
    workspaceId: v.id("workspaces"),
    creatorId: v.id("users"),
    leadId: v.optional(v.id("users")),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.union(
      v.literal("PLANNING"),
      v.literal("IN_PROGRESS"),
      v.literal("ON_HOLD"),
      v.literal("COMPLETED"),
      v.literal("CANCELLED"),
      v.literal("ARCHIVED"),
    ),
    priority: v.union(
      v.literal("LOW"),
      v.literal("MEDIUM"),
      v.literal("HIGH"),
      v.literal("URGENT"),
    ),
    memberIds: v.array(v.id("users")),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    resources: v.array(
      v.object({
        label: v.string(),
        type: v.union(
          v.literal("WEBSITE"),
          v.literal("FORM"),
          v.literal("DATABASE"),
          v.literal("GITHUB"),
          v.literal("COMMUNICATION"),
          v.literal("CUSTOM"),
        ),
        url: v.string(),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_workspace", ["workspaceId"])
    .index("by_workspace_status", ["workspaceId", "status"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["workspaceId"],
    }),

  projectUpdates: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    authorId: v.id("users"),
    body: v.string(),
    editedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_project", ["projectId"])
    .index("by_project_created", ["projectId", "createdAt"])
    .index("by_workspace", ["workspaceId"]),

  projectFavorites: defineTable({
    workspaceId: v.id("workspaces"),
    projectId: v.id("projects"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_workspace_user", ["workspaceId", "userId"])
    .index("by_project_user", ["projectId", "userId"])
    .index("by_project", ["projectId"]),

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
    role: v.optional(v.union(v.literal("MEMBER"), v.literal("ADMIN"))),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    revokedAt: v.optional(v.number()),
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
        v.literal("projects:read"),
        v.literal("projects:write"),
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
        v.literal("rag:read"),
        v.literal("rag:write"),
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

  mcpIdempotency: defineTable({
    apiKeyId: v.id("apiKeys"),
    workspaceId: v.id("workspaces"),
    operation: v.string(),
    key: v.string(),
    inputFingerprint: v.string(),
    taskId: v.id("tasks"),
    createdAt: v.number(),
  })
    .index("by_api_key", ["apiKeyId"])
    .index("by_api_key_operation_key", ["apiKeyId", "operation", "key"]),

  ragDocuments: defineTable({
    workspaceId: v.id("workspaces"),
    sourceType: v.union(
      v.literal("task"),
      v.literal("taskComment"),
      v.literal("project"),
      v.literal("projectUpdate"),
      v.literal("event"),
      v.literal("docs"),
    ),
    sourceId: v.string(),
    contentVersion: v.string(),
    contentHash: v.string(),
    indexStatus: v.union(
      v.literal("pending"),
      v.literal("indexing"),
      v.literal("complete"),
      v.literal("failed"),
    ),
    embeddingModel: v.string(),
    embeddingVersion: v.string(),
    chunkCount: v.number(),
    error: v.optional(v.string()),
    updatedAt: v.number(),
  })
    .index("by_workspace_source", ["workspaceId", "sourceType", "sourceId"])
    .index("by_workspace_status", ["workspaceId", "indexStatus"]),

  ragChunks: defineTable({
    workspaceId: v.id("workspaces"),
    documentId: v.id("ragDocuments"),
    sourceType: v.string(),
    sourceId: v.string(),
    sourceAnchor: v.string(),
    title: v.string(),
    ordinal: v.number(),
    text: v.string(),
    textHash: v.string(),
    embedding: v.array(v.number()),
    embeddingModel: v.string(),
    embeddingVersion: v.string(),
    version: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_document", ["documentId"])
    .index("by_workspace_source", ["workspaceId", "sourceId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 384,
      filterFields: ["workspaceId", "sourceType"],
    }),

  ragWorkspaceState: defineTable({
    workspaceId: v.id("workspaces"),
    indexVersion: v.number(),
    embeddingModel: v.string(),
    embeddingVersion: v.string(),
    pendingCount: v.number(),
    sourceSyncVersion: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  ragFeedback: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    questionHash: v.string(),
    rating: v.union(v.literal("up"), v.literal("down")),
    reason: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_workspace", ["workspaceId"]),

  iceProviderKeys: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    provider: v.union(
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openai"),
      v.literal("openrouter"),
    ),
    encryptedKey: v.string(),
    keySuffix: v.string(),
    updatedAt: v.number(),
  }).index("by_workspace_user_provider", [
    "workspaceId",
    "userId",
    "provider",
  ]),

  icePreferences: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    chatProvider: v.union(
      v.literal("local"),
      v.literal("gemini"),
      v.literal("claude"),
      v.literal("openai"),
      v.literal("openrouter"),
    ),
    chatModel: v.string(),
    embeddingProvider: v.optional(v.union(v.literal('local'), v.literal('openai'), v.literal('gemini'), v.literal('openrouter'))),
    embeddingModel: v.optional(v.string()),
    embeddingRevision: v.optional(v.number()),
    updatedAt: v.number(),
  }).index("by_workspace_user", ["workspaceId", "userId"]),

  iceDocuments: defineTable({
    workspaceId: v.id('workspaces'),
    userId: v.id('users'),
    namespace: v.string(),
    sourceType: v.string(),
    sourceId: v.string(),
    sourceRevision: v.number(),
    state: v.union(v.literal('indexing'), v.literal('complete'), v.literal('failed')),
    claim: v.string(),
    error: v.optional(v.string()),
    chunkCount: v.number(),
    updatedAt: v.number(),
  }).index('by_namespace_source', ['namespace', 'sourceType', 'sourceId'])
    .index('by_workspace_source', ['workspaceId', 'sourceType', 'sourceId']),

  iceChunks: defineTable({
    workspaceId: v.id('workspaces'), userId: v.id('users'), namespace: v.string(),
    documentId: v.id('iceDocuments'),
    text: v.string(), title: v.string(), anchor: v.string(), embedding: v.array(v.number()),
    searchEmbedding: v.optional(v.array(v.number())),
  }).index('by_document', ['documentId'])
    .vectorIndex('by_embedding_native', { vectorField: 'searchEmbedding', dimensions: 4096, filterFields: ['namespace'] }),
});
