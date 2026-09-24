/**
 * Ice BYOK provider keys — per-user, per-workspace, encrypted at rest.
 *
 * Raw keys are never returned to the browser: `status` exposes only
 * configured/suffix metadata, while the Next.js `/api/ice` worker reads the
 * decrypted key through `keyForWorker` while acting as the owning user.
 * Keys are never logged — errors carry provider names only.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { decryptIceProviderKey, encryptIceProviderKey } from "./iceKeys/crypto";
import {
  assertValidIceKeyProvider,
  assertValidIceProviderKey,
  getStoredKey,
  keySuffix,
  statusForUser,
} from "./iceKeys/model";

const workspaceIdArg = v.id("workspaces");
const providerArg = v.union(
  v.literal("gemini"),
  v.literal("claude"),
  v.literal("openai"),
  v.literal("openrouter"),
);

/** Configured/suffix metadata for the caller's own keys. No key material. */
export const status = query({
  args: { workspaceId: workspaceIdArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    return await statusForUser(ctx, args.workspaceId, userId);
  },
});

/**
 * Raw key for the owning user only. Called by the `/api/ice` worker while
 * acting as the user so saved keys work without the browser holding them.
 */
export const keyForWorker = query({
  args: { workspaceId: workspaceIdArg, provider: providerArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    assertValidIceKeyProvider(args.provider);
    const stored = await getStoredKey(
      ctx,
      args.workspaceId,
      userId,
      args.provider,
    );
    if (stored === null) return null;
    return await decryptIceProviderKey(stored.encryptedKey);
  },
});

export const saveKey = mutation({
  args: {
    workspaceId: workspaceIdArg,
    provider: providerArg,
    key: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    assertValidIceKeyProvider(args.provider);
    const trimmed = args.key.trim();
    assertValidIceProviderKey(trimmed);
    const now = Date.now();
    const existing = await getStoredKey(
      ctx,
      args.workspaceId,
      userId,
      args.provider,
    );
    if (existing === null) {
      await ctx.db.insert("iceProviderKeys", {
        workspaceId: args.workspaceId,
        userId,
        provider: args.provider,
        encryptedKey: await encryptIceProviderKey(trimmed),
        keySuffix: keySuffix(trimmed),
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        encryptedKey: await encryptIceProviderKey(trimmed),
        keySuffix: keySuffix(trimmed),
        updatedAt: now,
      });
    }
    return await statusForUser(ctx, args.workspaceId, userId);
  },
});

export const clearKey = mutation({
  args: { workspaceId: workspaceIdArg, provider: providerArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    assertValidIceKeyProvider(args.provider);
    const existing = await getStoredKey(
      ctx,
      args.workspaceId,
      userId,
      args.provider,
    );
    if (existing !== null) await ctx.db.delete(existing._id);
    return await statusForUser(ctx, args.workspaceId, userId);
  },
});
