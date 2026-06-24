import {
  getAuthSessionId,
  getAuthUserId,
  invalidateSessions,
  modifyAccountCredentials,
  retrieveAccount,
} from "@convex-dev/auth/server";
import { v } from "convex/values";
import { action, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserId } from "./lib/auth";
import { themePreference } from "./lib/validators";
import { normalizeEmail, normalizeName, userDto } from "./lib/users";
import { encryptTelegramToken } from "./telegram/crypto";

const TELEGRAM_TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,200}$/;
const internalApi = internal as any;

function normalizeLeadMinutes(values: number[] | undefined) {
  if (values === undefined) return undefined;
  const normalized = [...new Set(values)];
  if (normalized.length > 8) {
    throw new Error("At most 8 lead times are allowed");
  }
  for (const value of normalized) {
    if (!Number.isInteger(value) || value < 0 || value > 60 * 24 * 30) {
      throw new Error("Lead times must be minute integers from 0 to 43200");
    }
  }
  return normalized.sort((a, b) => a - b);
}

function makeWebhookSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export const get = query({
  args: {},
  handler: async (ctx) => await userDto(ctx, await requireUserId(ctx)),
});

export const update = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    themePreference: v.optional(themePreference),
    telegramBotToken: v.optional(v.string()),
    notifyLeadMinutesTask: v.optional(v.array(v.number())),
    notifyLeadMinutesEvent: v.optional(v.array(v.number())),
    notifyLeadCustomTask: v.optional(v.boolean()),
    notifyLeadCustomEvent: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patch: {
      name?: string;
      email?: string;
      themePreference?: "LIGHT" | "DARK" | "SYSTEM";
      telegramBotToken?: string;
      telegramBotTokenSuffix?: string;
      telegramChatId?: string;
      telegramWebhookSecret?: string;
      notifyLeadMinutesTask?: number[];
      notifyLeadMinutesEvent?: number[];
      notifyLeadCustomTask?: boolean;
      notifyLeadCustomEvent?: boolean;
    } = {};

    if (args.name !== undefined) patch.name = normalizeName(args.name);
    if (args.email !== undefined) {
      const email = normalizeEmail(args.email);
      patch.email = email;
      const passwordAccount = await ctx.db
        .query("authAccounts")
        .withIndex("userIdAndProvider", (q) =>
          q.eq("userId", userId).eq("provider", "password"),
        )
        .unique();
      if (passwordAccount !== null) {
        await ctx.db.patch(passwordAccount._id, { providerAccountId: email });
      }
    }
    if (args.themePreference !== undefined) {
      patch.themePreference = args.themePreference;
    }
    if (args.telegramBotToken !== undefined) {
      const token = args.telegramBotToken.trim();
      if (token === "") {
        patch.telegramBotToken = undefined;
        patch.telegramBotTokenSuffix = undefined;
        patch.telegramChatId = undefined;
        patch.telegramWebhookSecret = undefined;
      } else {
        if (!TELEGRAM_TOKEN_RE.test(token) || token.length > 256) {
          throw new Error("Invalid Telegram bot token format");
        }
        patch.telegramBotToken = await encryptTelegramToken(token);
        patch.telegramBotTokenSuffix = token.slice(-4);
        patch.telegramChatId = undefined;
        patch.telegramWebhookSecret = makeWebhookSecret();
      }
    }
    const taskLeads = normalizeLeadMinutes(args.notifyLeadMinutesTask);
    if (taskLeads !== undefined) patch.notifyLeadMinutesTask = taskLeads;
    const eventLeads = normalizeLeadMinutes(args.notifyLeadMinutesEvent);
    if (eventLeads !== undefined) patch.notifyLeadMinutesEvent = eventLeads;
    if (args.notifyLeadCustomTask !== undefined) {
      patch.notifyLeadCustomTask = args.notifyLeadCustomTask;
    }
    if (args.notifyLeadCustomEvent !== undefined) {
      patch.notifyLeadCustomEvent = args.notifyLeadCustomEvent;
    }

    await ctx.db.patch(userId, patch);
    return await userDto(ctx, userId);
  },
});

export const getPasswordAccountForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("userIdAndProvider", (q) =>
        q.eq("userId", args.userId).eq("provider", "password"),
      )
      .unique();
    if (account === null) return null;
    return {
      providerAccountId: account.providerAccountId,
    };
  },
});

function validatePasswordChange(args: {
  currentPassword: string;
  newPassword: string;
}) {
  if (args.currentPassword.length < 1) {
    throw new Error("Current password is required");
  }
  if (args.newPassword.length < 8 || args.newPassword.length > 256) {
    throw new Error("New password must be between 8 and 256 characters");
  }
  if (args.currentPassword === args.newPassword) {
    throw new Error("New password must differ from the current one");
  }
}

export const changePassword = action({
  args: {
    currentPassword: v.string(),
    newPassword: v.string(),
  },
  handler: async (ctx, args) => {
    validatePasswordChange(args);
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("Unauthorized");
    }

    const account = await ctx.runQuery(
      internalApi.profile.getPasswordAccountForUser,
      { userId },
    );
    if (account === null) {
      throw new Error("Password sign-in is not enabled for this account");
    }

    try {
      const retrieved = await retrieveAccount(ctx, {
        provider: "password",
        account: {
          id: account.providerAccountId,
          secret: args.currentPassword,
        },
      });
      if (retrieved.user._id !== userId) {
        throw new Error("Invalid current password");
      }
    } catch {
      throw new Error("Invalid current password");
    }

    await modifyAccountCredentials(ctx, {
      provider: "password",
      account: {
        id: account.providerAccountId,
        secret: args.newPassword,
      },
    });

    const currentSessionId = await getAuthSessionId(ctx);
    await invalidateSessions(ctx, {
      userId,
      ...(currentSessionId === null || currentSessionId === undefined
        ? {}
        : { except: [currentSessionId] }),
    });
    return { ok: true };
  },
});
