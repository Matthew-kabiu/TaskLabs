import { v } from "convex/values";

export const workspaceRole = v.union(
  v.literal("OWNER"),
  v.literal("ADMIN"),
  v.literal("MEMBER"),
);

export const taskStatus = v.union(
  v.literal("BACKLOG"),
  v.literal("TODO"),
  v.literal("IN_PROGRESS"),
  v.literal("IN_REVIEW"),
  v.literal("DONE"),
  v.literal("CANCELLED"),
  v.literal("ARCHIVED"),
);

export const taskPriority = v.union(
  v.literal("LOW"),
  v.literal("MEDIUM"),
  v.literal("HIGH"),
  v.literal("URGENT"),
);

export const taskSort = v.union(
  v.literal("manual"),
  v.literal("dueDate"),
  v.literal("priority"),
  v.literal("createdAt"),
  v.literal("title"),
);

export const projectStatus = v.union(
  v.literal("PLANNING"),
  v.literal("IN_PROGRESS"),
  v.literal("ON_HOLD"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
  v.literal("ARCHIVED"),
);

export const projectResourceType = v.union(
  v.literal("WEBSITE"),
  v.literal("FORM"),
  v.literal("DATABASE"),
  v.literal("GITHUB"),
  v.literal("COMMUNICATION"),
  v.literal("CUSTOM"),
);

export const projectResource = v.object({
  label: v.string(),
  type: projectResourceType,
  url: v.string(),
});

export const eventStatus = v.union(
  v.literal("SCHEDULED"),
  v.literal("COMPLETED"),
  v.literal("CANCELLED"),
);

export const eventColor = v.union(
  v.literal("slate"),
  v.literal("red"),
  v.literal("orange"),
  v.literal("amber"),
  v.literal("green"),
  v.literal("teal"),
  v.literal("blue"),
  v.literal("violet"),
);

export const notificationType = v.union(
  v.literal("TASK_ASSIGNED"),
  v.literal("TASK_UPDATED"),
  v.literal("TASK_DUE_SOON"),
  v.literal("EVENT_SOON"),
  v.literal("EVENT_STARTED"),
  v.literal("EVENT_COMPLETED"),
  v.literal("INVITE_ACCEPTED"),
  v.literal("MENTION"),
  v.literal("SYSTEM"),
);

export const themePreference = v.union(
  v.literal("LIGHT"),
  v.literal("DARK"),
  v.literal("SYSTEM"),
);

export const platformRole = v.union(v.literal("ADMIN"), v.literal("MEMBER"));

export const apiKeyScope = v.union(
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
  v.literal("system:read"),
  v.literal("system:write"),
);
