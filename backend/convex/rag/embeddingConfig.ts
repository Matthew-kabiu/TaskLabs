import { v } from 'convex/values';
import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { RAG_EMBEDDING_MODEL } from './providers';

export const embeddingProviderArg = v.union(v.literal('local'), v.literal('openai'), v.literal('gemini'), v.literal('openrouter'));

/** Earlier namespaces kept searchable after a reindex or model change. */
export const MAX_RETAINED_EMBEDDINGS = 3;

export type RetainedEmbedding = NonNullable<Doc<'icePreferences'>['retainedEmbeddings']>[number];

export async function embeddingConfig(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const prefs = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', workspaceId).eq('userId', userId)).unique();
  const provider = prefs?.embeddingProvider ?? 'local';
  const model = prefs?.embeddingModel ?? RAG_EMBEDDING_MODEL;
  const revision = prefs?.embeddingRevision ?? 0;
  const retained: RetainedEmbedding[] = prefs?.retainedEmbeddings ?? [];
  return { provider, model, revision, retained, namespace: `${workspaceId}:${userId}:${revision}:${provider}:${model}:native-v2` };
}

/**
 * Retain the namespace being replaced, newest first. Returns the new list and
 * the namespaces that fell off it, whose rows the caller must purge.
 */
export function retainNamespace(config: Awaited<ReturnType<typeof embeddingConfig>>) {
  const current: RetainedEmbedding = { namespace: config.namespace, provider: config.provider, model: config.model };
  const all = [current, ...config.retained.filter(entry => entry.namespace !== config.namespace)];
  return { retained: all.slice(0, MAX_RETAINED_EMBEDDINGS), dropped: all.slice(MAX_RETAINED_EMBEDDINGS).map(entry => entry.namespace) };
}
