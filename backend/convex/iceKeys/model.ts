import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

export const ICE_KEY_PROVIDERS = [
  "gemini",
  "claude",
  "openai",
  "openrouter",
] as const;

export type IceKeyProvider = (typeof ICE_KEY_PROVIDERS)[number];

export function assertValidIceKeyProvider(
  provider: string,
): asserts provider is IceKeyProvider {
  if (!(ICE_KEY_PROVIDERS as readonly string[]).includes(provider)) {
    throw new Error("Unknown Ice provider");
  }
}

export function assertValidIceProviderKey(key: string) {
  if (key.length < 8 || key.length > 500) {
    throw new Error("API key must be 8-500 characters");
  }
}

export function keySuffix(key: string) {
  return key.slice(-4);
}

export async function getStoredKey(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  provider: IceKeyProvider,
) {
  return await ctx.db
    .query("iceProviderKeys")
    .withIndex("by_workspace_user_provider", (q) =>
      q
        .eq("workspaceId", workspaceId)
        .eq("userId", userId)
        .eq("provider", provider),
    )
    .unique();
}

export type IceKeyStatusEntry = {
  configured: boolean;
  suffix: string | null;
  updatedAt: number | null;
};

export async function statusForUser(
  ctx: DbCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
): Promise<Record<IceKeyProvider, IceKeyStatusEntry>> {
  const status = {} as Record<IceKeyProvider, IceKeyStatusEntry>;
  for (const provider of ICE_KEY_PROVIDERS) {
    const stored = await getStoredKey(ctx, workspaceId, userId, provider);
    status[provider] =
      stored === null
        ? { configured: false, suffix: null, updatedAt: null }
        : {
            configured: true,
            suffix: stored.keySuffix,
            updatedAt: stored.updatedAt,
          };
  }
  return status;
}
