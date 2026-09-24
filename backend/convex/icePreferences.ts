/**
 * Ice preferences — per-user, per-workspace chat provider + model selection.
 *
 * Plain metadata (no secrets), written only through explicit save actions.
 * Chat selection and embedding index revision are independent.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireMembership } from "./lib/auth";
import { embeddingConfig, embeddingProviderArg } from './rag/embeddingConfig';
import { RAG_EMBEDDING_MODEL } from './rag/providers';
import { getStoredKey } from './iceKeys/model';

const workspaceIdArg = v.id("workspaces");
const chatProviderArg = v.union(
  v.literal("local"),
  v.literal("gemini"),
  v.literal("claude"),
  v.literal("openai"),
  v.literal("openrouter"),
);

export const get = query({
  args: { workspaceId: workspaceIdArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    const prefs = await ctx.db
      .query("icePreferences")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId),
      )
      .unique();
    if (prefs === null) return null;
    return {
      chatProvider: prefs.chatProvider,
      chatModel: prefs.chatModel,
      updatedAt: prefs.updatedAt,
      embedding: await embeddingConfig(ctx, args.workspaceId, userId),
    };
  },
});

export const saveEmbedding = mutation({
  args: { workspaceId: workspaceIdArg, provider: embeddingProviderArg, model: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    if (!args.model.trim() || args.model.length > 240 || args.model !== args.model.trim()) throw new Error('Invalid embedding model identifier');
    if (args.provider === 'local' && args.model !== RAG_EMBEDDING_MODEL) throw new Error('Unsupported local embedding model');
    if (args.provider !== 'local' && !(await getStoredKey(ctx, args.workspaceId, userId, args.provider))) throw new Error('Save your own API key for this embedding provider first');
    const current = await embeddingConfig(ctx, args.workspaceId, userId);
    const existing = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
    const patch = { embeddingProvider: args.provider, embeddingModel: args.model, embeddingRevision: current.revision + (current.provider !== args.provider || current.model !== args.model ? 1 : 0), updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert('icePreferences', { workspaceId: args.workspaceId, userId, chatProvider: 'local', chatModel: 'local-grounded', ...patch });
    return { ok: true };
  },
});

export const save = mutation({
  args: {
    workspaceId: workspaceIdArg,
    chatProvider: chatProviderArg,
    chatModel: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    const chatModel = args.chatModel.trim().slice(0, 240);
    if (chatModel.length < 1) throw new Error("Model is required");
    const now = Date.now();
    const existing = await ctx.db
      .query("icePreferences")
      .withIndex("by_workspace_user", (q) =>
        q.eq("workspaceId", args.workspaceId).eq("userId", userId),
      )
      .unique();
    if (existing === null) {
      await ctx.db.insert("icePreferences", {
        workspaceId: args.workspaceId,
        userId,
        chatProvider: args.chatProvider,
        chatModel,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        chatProvider: args.chatProvider,
        chatModel,
        updatedAt: now,
      });
    }
    return { ok: true };
  },
});
