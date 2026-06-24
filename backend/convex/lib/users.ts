import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireUserId } from "./auth";
import { ensurePersonalWorkspace } from "../workspaces/service";

type DbCtx = QueryCtx | MutationCtx;

export function normalizeEmail(email: string) {
  const trimmed = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) || trimmed.length > 254) {
    throw new Error("Invalid email");
  }
  return trimmed;
}

export function normalizeName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new Error("Name is required");
  }
  if (trimmed.length > 120) {
    throw new Error("Name must be at most 120 characters");
  }
  return trimmed;
}

export async function hasAnyAdmin(ctx: DbCtx) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_platform_role", (q) => q.eq("platformRole", "ADMIN"))
    .take(1);
  return admins.length > 0;
}

export async function requireAdmin(ctx: DbCtx) {
  const userId = await requireUserId(ctx);
  const user = await ctx.db.get(userId);
  if (user?.platformRole !== "ADMIN") {
    throw new Error("Admin only");
  }
  return { userId, user };
}

export async function userDto(ctx: DbCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new Error("User not found");
  }
  return {
    id: user._id,
    email: user.email ?? null,
    name: user.name ?? null,
    platformRole: user.platformRole ?? "MEMBER",
    themePreference: user.themePreference ?? "SYSTEM",
    telegramBotTokenSet: user.telegramBotToken !== undefined,
    telegramChatLinked: user.telegramChatId !== undefined,
    notifyLeadMinutesTask: user.notifyLeadMinutesTask ?? [60, 1440],
    notifyLeadMinutesEvent: user.notifyLeadMinutesEvent ?? [15, 60],
    notifyLeadCustomTask: user.notifyLeadCustomTask ?? false,
    notifyLeadCustomEvent: user.notifyLeadCustomEvent ?? false,
  };
}

export async function claimCurrentUserRole(
  ctx: MutationCtx,
  input: {
    role: "ADMIN" | "MEMBER";
    name?: string;
    workspaceName?: string;
  },
) {
  const userId = await requireUserId(ctx);
  const patch: {
    platformRole: "ADMIN" | "MEMBER";
    name?: string;
    themePreference?: "SYSTEM";
    notifyLeadMinutesTask?: number[];
    notifyLeadMinutesEvent?: number[];
    notifyLeadCustomTask?: boolean;
    notifyLeadCustomEvent?: boolean;
  } = {
    platformRole: input.role,
    themePreference: "SYSTEM",
    notifyLeadMinutesTask: [60, 1440],
    notifyLeadMinutesEvent: [15, 60],
    notifyLeadCustomTask: false,
    notifyLeadCustomEvent: false,
  };
  if (input.name !== undefined) patch.name = normalizeName(input.name);
  await ctx.db.patch(userId, patch);
  await ensurePersonalWorkspace(ctx, input.workspaceName);
  return await userDto(ctx, userId);
}
