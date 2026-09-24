/**
 * Ice preferences — per-user, per-workspace chat provider + model selection.
 *
 * Plain metadata (no secrets), written only through explicit save actions.
 * Chat selection and embedding index revision are independent.
 */

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from './_generated/api';
import { requireMembership } from "./lib/auth";
import { embeddingConfig, embeddingProviderArg, retainNamespace } from './rag/embeddingConfig';
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
      systemPrompt: prefs.systemPrompt ?? '',
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
    const changed = current.provider !== args.provider || current.model !== args.model;
    // A model change starts a new namespace; the old one stays searchable.
    const { retained, dropped } = changed ? retainNamespace(current) : { retained: current.retained, dropped: [] };
    const patch = { embeddingProvider: args.provider, embeddingModel: args.model, embeddingRevision: current.revision + (changed ? 1 : 0), retainedEmbeddings: retained, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert('icePreferences', { workspaceId: args.workspaceId, userId, chatProvider: 'local', chatModel: 'local-grounded', ...patch });
    for (const namespace of dropped) await ctx.scheduler.runAfter(0, internal.iceIndex.purgeNamespace, { namespace });
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

export const ICE_SYSTEM_PROMPT_MAX = 4000;

/** Per-user extra instructions for Ice. Empty clears them. */
export const saveSystemPrompt = mutation({
  args: { workspaceId: workspaceIdArg, prompt: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    const prompt = args.prompt.trim();
    if (prompt.length > ICE_SYSTEM_PROMPT_MAX) throw new Error(`System prompt must be ${ICE_SYSTEM_PROMPT_MAX} characters or fewer`);
    const existing = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
    const patch = { systemPrompt: prompt || undefined, updatedAt: Date.now() };
    if (existing) await ctx.db.patch(existing._id, patch);
    else await ctx.db.insert('icePreferences', { workspaceId: args.workspaceId, userId, chatProvider: 'local', chatModel: 'local-grounded', ...patch });
    return { ok: true };
  },
});
