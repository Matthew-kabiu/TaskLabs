import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

const TELEGRAM_TOKEN_RE = /^\d{5,15}:[A-Za-z0-9_-]{30,200}$/;

export function assertValidTelegramToken(token: string) {
  if (!TELEGRAM_TOKEN_RE.test(token) || token.length > 256) {
    throw new Error("Invalid Telegram bot token format");
  }
}

export function tokenSuffix(token: string | undefined) {
  return token === undefined ? null : token.slice(-4);
}

export async function getTelegramUser(ctx: DbCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (user === null) throw new Error("User not found");
  return user;
}

export function telegramSummaryDto(
  user: Awaited<ReturnType<typeof getTelegramUser>>,
) {
  return {
    hasToken: user.telegramBotToken !== undefined,
    suffix: user.telegramBotTokenSuffix ?? null,
    chatLinked: user.telegramChatId !== undefined,
  };
}
