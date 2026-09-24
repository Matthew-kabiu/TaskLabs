import type { Id } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { embeddingConfig } from './embeddingConfig';
import { readCanonicalSource, RagForbiddenError } from './model';
import { isRagSourceType } from './providers';

export async function visibleSource(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, type: string, id: string) {
  if (!isRagSourceType(type)) return null;
  if (type === 'docs') return { text: '', title: id, anchor: id, target: { page: 'docs' as const } };
  try { return await readCanonicalSource(ctx, workspaceId, userId, type, id); }
  catch (error) { if (error instanceof RagForbiddenError) return null; throw error; }
}

// The legacy document table remains the change ledger populated by domain
// mutations. No user reads another user's vectors or index status.
export async function personalSources(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const config = await embeddingConfig(ctx, workspaceId, userId);
  const ledger = await ctx.db.query('ragDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', workspaceId)).collect();
  const entries = [];
  for (const source of ledger) {
    const content = await visibleSource(ctx, workspaceId, userId, source.sourceType, source.sourceId);
    if (!content) continue;
    const indexed = await ctx.db.query('iceDocuments').withIndex('by_namespace_source', q => q.eq('namespace', config.namespace).eq('sourceType', source.sourceType).eq('sourceId', source.sourceId)).unique();
    entries.push({ source, content, indexed });
  }
  return { config, entries };
}

export async function personalStatus(ctx: QueryCtx | MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const { config, entries } = await personalSources(ctx, workspaceId, userId);
  let completeCount = 0, failedCount = 0, pendingCount = 0, chunkCount = 0;
  const recentErrors: { sourceType: string; sourceId: string; error: string }[] = [];
  for (const { source, indexed } of entries) {
    if (!indexed || indexed.sourceRevision !== source.updatedAt || indexed.state === 'indexing') pendingCount++;
    else if (indexed.state === 'complete') { completeCount++; chunkCount += indexed.chunkCount; }
    else { failedCount++; if (recentErrors.length < 5) recentErrors.push({ sourceType: source.sourceType, sourceId: source.sourceId, error: indexed.error ?? 'Indexing failed' }); }
  }
  return { ...config, indexVersion: config.revision, embeddingModel: config.model, embeddingVersion: config.namespace, completeCount, failedCount, pendingCount, chunkCount, recentErrors, updatedAt: null };
}

export async function deletePersonalSource(ctx: MutationCtx, workspaceId: Id<'workspaces'>, sourceType: string, sourceId: string) {
  const documents = await ctx.db.query('iceDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', workspaceId).eq('sourceType', sourceType).eq('sourceId', sourceId)).collect();
  for (const doc of documents) {
    const chunks = await ctx.db.query('iceChunks').withIndex('by_document', q => q.eq('documentId', doc._id)).collect();
    for (const chunk of chunks) await ctx.db.delete(chunk._id);
    await ctx.db.delete(doc._id);
  }
}
