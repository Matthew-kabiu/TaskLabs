import { v } from 'convex/values';
import type { Id } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { RAG_EMBEDDING_MODEL } from './providers';

export const embeddingProviderArg = v.union(v.literal('local'), v.literal('openai'), v.literal('gemini'), v.literal('openrouter'));

export async function embeddingConfig(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const prefs = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', workspaceId).eq('userId', userId)).unique();
  const provider = prefs?.embeddingProvider ?? 'local';
  const model = prefs?.embeddingModel ?? RAG_EMBEDDING_MODEL;
  const revision = prefs?.embeddingRevision ?? 0;
  return { provider, model, revision, namespace: `${workspaceId}:${userId}:${revision}:${provider}:${model}:native-v2` };
}
