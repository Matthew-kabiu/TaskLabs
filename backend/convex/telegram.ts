import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import {
  action,
  internalMutation,
  internalQuery,
  mutation,
  query,
  type ActionCtx,
} from "./_generated/server";
import { requireUserId } from "./lib/auth";
import { createNotificationRecord } from "./notifications/model";
import {
  assertValidTelegramToken,
  getTelegramUser,
  telegramSummaryDto,
} from "./telegram/model";
import { internal } from "./_generated/api";
import {
  decryptTelegramToken,
  encryptTelegramToken,
} from "./telegram/crypto";
import { telegramApiOrigin, telegramWebhookOrigin } from "./telegram/env";

function makeWebhookSecret() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

class TelegramAuthError extends Error {
  constructor(message = "Telegram rejected the token") {
    super(message);
    this.name = "TelegramAuthError";
  }
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
  if (response.status === 401 || response.status === 404) {
    throw new TelegramAuthError();
  }
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Telegram ${method} failed with status ${response.status}: ${text.slice(
        0,
        200,
      )}`,
    );
  }
  return await response.json().catch(() => ({}));
}

type TelegramUpdate = {
  message?: {
    text?: string;
    date?: number;
    chat?: { id?: number | string };
  };
};

function latestStartChatId(updates: TelegramUpdate[]) {
  return updates
    .map((update) => update.message)
    .filter(
      (
        message,
      ): message is NonNullable<TelegramUpdate["message"]> & {
        chat: { id: number | string };
      } =>
        Boolean(
          message?.text === "/start" &&
            (typeof message.chat?.id === "number" ||
              typeof message.chat?.id === "string"),
        ),
    )
    .sort((a, b) => (b.date ?? 0) - (a.date ?? 0))[0]?.chat.id;
}

export const tokenSummary = query({
  args: {},
  handler: async (ctx) =>
    telegramSummaryDto(await getTelegramUser(ctx, await requireUserId(ctx))),
});

export const saveToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const token = args.token.trim();
    assertValidTelegramToken(token);
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, {
      telegramBotToken: await encryptTelegramToken(token),
      telegramBotTokenSuffix: token.slice(-4),
      telegramChatId: undefined,
      telegramWebhookSecret: makeWebhookSecret(),
    });
    return telegramSummaryDto(await getTelegramUser(ctx, userId));
  },
});

export const clearToken = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    await ctx.db.patch(userId, {
      telegramBotToken: undefined,
      telegramBotTokenSuffix: undefined,
      telegramChatId: undefined,
      telegramWebhookSecret: undefined,
    });
    return telegramSummaryDto(await getTelegramUser(ctx, userId));
  },
});

export const linkChat = mutation({
  args: { chatId: v.string() },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    if (args.chatId.trim().length < 1) {
      throw new Error("chatId is required");
    }
    await ctx.db.patch(userId, { telegramChatId: args.chatId.trim() });
    return telegramSummaryDto(await getTelegramUser(ctx, userId));
  },
});

async function requireActionUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) {
    throw new Error("Unauthorized");
  }
  return userId;
}

export const sendTest = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireActionUserId(ctx);
    const config = await ctx.runQuery(internalApi.telegram.getSendConfig, {
      userId,
    });
    if (config?.token === undefined) {
      throw new Error("No bot token saved");
    }
    if (config.chatId === undefined) {
      throw new Error("Bot not linked: send /start to your bot first");
    }
    try {
      await postTelegramJson(config.token, "sendMessage", {
        chat_id: config.chatId,
        text: "<b>TaskLabs test</b> - your bot is connected.",
        parse_mode: "HTML",
      });
    } catch (error) {
      if (!(error instanceof TelegramAuthError)) throw error;
      await ctx.runMutation(internalApi.telegram.clearDisconnectedToken, {
        userId,
      });
      throw new Error("Telegram rejected the token. Please re-paste it.");
    }
    await ctx.runMutation(internalApi.notifications.createForUser, {
      userId,
      type: "SYSTEM",
      payload: { message: "TaskLabs test - your bot is connected." },
    });
    return { ok: true };
  },
});

export const linkChatFromStart = action({
  args: {},
  handler: async (ctx) => {
    const userId = await requireActionUserId(ctx);
    const config = await ctx.runQuery(internalApi.telegram.getSendConfig, {
      userId,
    });
    if (config?.token === undefined) {
      throw new Error("Save your bot token first");
    }
    if (config.webhookSecret === undefined) {
      throw new Error("Save your bot token again to create webhook settings");
    }

    const webhookUrl = `${telegramWebhookOrigin()}/telegram/webhook/${encodeURIComponent(
      userId,
    )}`;

    try {
      await postTelegramJson(config.token, "deleteWebhook", {
        drop_pending_updates: false,
      });
      const updatesResponse = (await postTelegramJson(
        config.token,
        "getUpdates",
        {
          timeout: 0,
          limit: 50,
        },
      )) as { result?: TelegramUpdate[] };
      await postTelegramJson(config.token, "setWebhook", {
        url: webhookUrl,
        allowed_updates: ["message"],
        secret_token: config.webhookSecret,
      });

      const chatId = latestStartChatId(updatesResponse.result ?? []);
      if (chatId === undefined) {
        throw new Error(
          "No /start message found. Send /start to your bot, then click Link chat.",
        );
      }
      await ctx.runMutation(internalApi.telegram.acceptWebhookStart, {
        userId,
        chatId: String(chatId),
      });
      return { hasToken: true, chatLinked: true, suffix: config.suffix };
    } catch (error) {
      if (!(error instanceof TelegramAuthError)) throw error;
      await ctx.runMutation(internalApi.telegram.clearDisconnectedToken, {
        userId,
      });
      throw new Error("Telegram rejected the token. Please re-paste it.");
    }
  },
});

const internalApi = internal as any;

export const getSendConfig = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getTelegramUser(ctx, args.userId);
    return {
      token:
        user.telegramBotToken === undefined
          ? undefined
          : await decryptTelegramToken(user.telegramBotToken),
      chatId: user.telegramChatId,
      suffix: user.telegramBotTokenSuffix ?? null,
      webhookSecret: user.telegramWebhookSecret,
    };
  },
});

export const clearDisconnectedToken = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      telegramBotToken: undefined,
      telegramBotTokenSuffix: undefined,
      telegramChatId: undefined,
      telegramWebhookSecret: undefined,
    });
    await createNotificationRecord(ctx, {
      userId: args.userId,
      type: "SYSTEM",
      payload: {
        message: "Telegram disconnected - please re-paste your bot token",
      },
    });
    return { ok: true };
  },
});

export const getWebhookSecret = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await getTelegramUser(ctx, args.userId);
    return user.telegramWebhookSecret ?? null;
  },
});

export const acceptWebhookStart = internalMutation({
  args: { userId: v.id("users"), chatId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { telegramChatId: args.chatId });
    return { ok: true };
  },
});
