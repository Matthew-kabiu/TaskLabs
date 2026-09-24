import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { action, internalQuery, mutation, query } from './_generated/server';
import { internal } from './_generated/api';
import { requireMembership, requireMembershipForUser } from './lib/auth';
import { tasklabsRateLimiter } from './lib/rateLimits';
import { embeddingConfig } from './rag/embeddingConfig';
import { indexVector } from './rag/embeddingModels';
import { personalSources, personalStatus, visibleSource } from './rag/personal';
import { completeWorkspaceSourceSync, seedMissingRagSources } from './rag/service';
import { RAG_SOURCE_SYNC_VERSION, isRagSourceType, type RetrievedChunk } from './rag/providers';

const workspaceId = v.id('workspaces');
export const config = query({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  return await embeddingConfig(ctx, args.workspaceId, userId);
}});
export const status = query({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  return await personalStatus(ctx, args.workspaceId, userId);
}});

export const beginIndex = mutation({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  await tasklabsRateLimiter.limit(ctx, 'ragIndex', { key: `${userId}:${args.workspaceId}`, throws: true });
  return { ok: true };
}});

const canonicalSourceType = v.union(
  v.literal('task'),
  v.literal('taskComment'),
  v.literal('project'),
  v.literal('projectUpdate'),
  v.literal('event'),
);

export const syncSources = mutation({ args: {
  workspaceId,
  sourceType: canonicalSourceType,
  paginationOpts: paginationOptsValidator,
}, handler: async (ctx, args) => {
  await requireMembership(ctx, args.workspaceId);
  const state = await ctx.db.query('ragWorkspaceState').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).unique();
  if ((state?.sourceSyncVersion ?? 0) >= RAG_SOURCE_SYNC_VERSION) {
    return { seeded: 0, isDone: true, continueCursor: '', alreadySynced: true };
  }

  let sourceIds: string[];
  let isDone: boolean;
  let continueCursor: string;
  if (args.sourceType === 'task') {
    const page = await ctx.db.query('tasks').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).paginate(args.paginationOpts);
    sourceIds = page.page.map(source => source._id);
    ({ isDone, continueCursor } = page);
  } else if (args.sourceType === 'taskComment') {
    const page = await ctx.db.query('taskComments').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).paginate(args.paginationOpts);
    sourceIds = page.page.map(source => source._id);
    ({ isDone, continueCursor } = page);
  } else if (args.sourceType === 'project') {
    const page = await ctx.db.query('projects').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).paginate(args.paginationOpts);
    sourceIds = page.page.map(source => source._id);
    ({ isDone, continueCursor } = page);
  } else if (args.sourceType === 'projectUpdate') {
    const page = await ctx.db.query('projectUpdates').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).paginate(args.paginationOpts);
    sourceIds = page.page.map(source => source._id);
    ({ isDone, continueCursor } = page);
  } else {
    const page = await ctx.db.query('calendarEvents').withIndex('by_workspace', q => q.eq('workspaceId', args.workspaceId)).paginate(args.paginationOpts);
    sourceIds = page.page.map(source => source._id);
    ({ isDone, continueCursor } = page);
  }
  const seeded = await seedMissingRagSources(ctx, args.workspaceId, args.sourceType, sourceIds);
  return { seeded, isDone, continueCursor, alreadySynced: false };
}});

export const finishSourceSync = mutation({ args: { workspaceId }, handler: async (ctx, args) => {
  await requireMembership(ctx, args.workspaceId);
  await completeWorkspaceSourceSync(ctx, args.workspaceId);
  return { ok: true };
}});

export const claim = mutation({ args: { workspaceId, namespace: v.string() }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const { config, entries } = await personalSources(ctx, args.workspaceId, userId);
  if (config.namespace !== args.namespace) throw new Error('Embedding selection changed; retry indexing');
  const now = Date.now();
  for (const { source, indexed, content } of entries) {
    if (indexed?.sourceRevision === source.updatedAt && (indexed.state === 'complete' || indexed.state === 'failed' || indexed.updatedAt > now - 300_000)) continue;
    const claim = Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
    const fields = { workspaceId: args.workspaceId, userId, namespace: config.namespace, sourceType: source.sourceType, sourceId: source.sourceId, sourceRevision: source.updatedAt, state: 'indexing' as const, claim, chunkCount: 0, updatedAt: now };
    const documentId = indexed?._id ?? await ctx.db.insert('iceDocuments', fields);
    if (indexed) await ctx.db.patch(indexed._id, { ...fields, error: undefined });
    return { documentId, claim, sourceType: source.sourceType, sourceId: source.sourceId, ...content };
  }
  return null;
}});

export const write = mutation({ args: {
  workspaceId, namespace: v.string(), documentId: v.id('iceDocuments'), claim: v.string(),
  chunks: v.array(v.object({ text: v.string(), title: v.string(), anchor: v.string(), embedding: v.array(v.number()) })),
}, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const config = await embeddingConfig(ctx, args.workspaceId, userId);
  const doc = await ctx.db.get(args.documentId);
  if (!doc || doc.userId !== userId || doc.workspaceId !== args.workspaceId || doc.namespace !== config.namespace || args.namespace !== config.namespace || doc.claim !== args.claim || doc.state !== 'indexing') throw new Error('Index claim expired');
  const source = await visibleSource(ctx, args.workspaceId, userId, doc.sourceType, doc.sourceId);
  const ledger = await ctx.db.query('ragDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', args.workspaceId).eq('sourceType', doc.sourceType as 'task').eq('sourceId', doc.sourceId)).unique();
  if (!source || !ledger || ledger.updatedAt !== doc.sourceRevision) throw new Error('Source changed; retry indexing');
  if (args.chunks.length > 200 || args.chunks.some(c => c.text.length > 10000 || !c.embedding.length || c.embedding.length > 4096 || c.embedding.some(n => !Number.isFinite(n)) || c.embedding.length !== args.chunks[0].embedding.length)) throw new Error('Invalid embedding batch');
  const old = await ctx.db.query('iceChunks').withIndex('by_document', q => q.eq('documentId', doc._id)).collect();
  for (const row of old) await ctx.db.delete(row._id);
  for (const chunk of args.chunks) await ctx.db.insert('iceChunks', { workspaceId: args.workspaceId, userId, namespace: config.namespace, documentId: doc._id, ...chunk, searchEmbedding: indexVector(chunk.embedding) });
  await ctx.db.patch(doc._id, { state: 'complete', chunkCount: args.chunks.length, error: undefined, updatedAt: Date.now() });
  return { ok: true };
}});

export const failed = mutation({ args: { workspaceId, documentId: v.id('iceDocuments'), claim: v.string(), error: v.string() }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const doc = await ctx.db.get(args.documentId);
  if (!doc || doc.userId !== userId || doc.workspaceId !== args.workspaceId || doc.claim !== args.claim) return;
  await ctx.db.patch(doc._id, { state: 'failed', error: args.error.slice(0, 300), updatedAt: Date.now() });
}});

export const reindex = mutation({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const prefs = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', args.workspaceId).eq('userId', userId)).unique();
  const config = await embeddingConfig(ctx, args.workspaceId, userId);
  const fields = { embeddingRevision: config.revision + 1, updatedAt: Date.now() };
  if (prefs) await ctx.db.patch(prefs._id, fields);
  else await ctx.db.insert('icePreferences', { workspaceId: args.workspaceId, userId, chatProvider: 'local', chatModel: 'local-grounded', ...fields });
  return { ok: true };
}});

export const authorize = internalQuery({ args: { workspaceId, userId: v.id('users') }, handler: async (ctx, args) => {
  await requireMembershipForUser(ctx, args.workspaceId, args.userId);
  return await embeddingConfig(ctx, args.workspaceId, args.userId);
}});
export const resolve = internalQuery({ args: { workspaceId, userId: v.id('users'), namespace: v.string(), dimensions: v.number(), candidates: v.array(v.object({ id: v.id('iceChunks'), score: v.number() })), topK: v.number() }, handler: async (ctx, args): Promise<RetrievedChunk[]> => {
  await requireMembershipForUser(ctx, args.workspaceId, args.userId);
  const config = await embeddingConfig(ctx, args.workspaceId, args.userId);
  if (args.namespace !== config.namespace) throw new Error('Embedding selection changed; retry search');
  const results: RetrievedChunk[] = [];
  for (const candidate of args.candidates) {
    if (results.length >= args.topK) break;
    if (candidate.score < 0.2) continue;
    const chunk = await ctx.db.get(candidate.id);
    if (!chunk || chunk.userId !== args.userId || chunk.workspaceId !== args.workspaceId || chunk.namespace !== config.namespace) continue;
    if (chunk.embedding.length !== args.dimensions) throw new Error('Provider embedding dimensions changed. Reindex your sources.');
    const doc = await ctx.db.get(chunk.documentId);
    if (!doc || doc.state !== 'complete' || !isRagSourceType(doc.sourceType)) continue;
    const ledger = await ctx.db.query('ragDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', args.workspaceId).eq('sourceType', doc.sourceType as 'task').eq('sourceId', doc.sourceId)).unique();
    if (!ledger || ledger.updatedAt !== doc.sourceRevision) continue;
    const source = await visibleSource(ctx, args.workspaceId, args.userId, doc.sourceType, doc.sourceId);
    if (!source) continue;
    results.push({ text: chunk.text, title: chunk.title, anchor: chunk.anchor, sourceType: doc.sourceType, sourceId: doc.sourceId, score: candidate.score, target: source.target });
  }
  return results;
}});

// Vector search is an action in Convex, not a database query.
export const retrieve = action({ args: { workspaceId, namespace: v.string(), vector: v.array(v.number()), topK: v.optional(v.number()) }, handler: async (ctx, args): Promise<{ results: RetrievedChunk[]; indexVersion: number; empty: boolean }> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Unauthorized');
  await tasklabsRateLimiter.limit(ctx, 'ragQuery', { key: userId, throws: true });
  const config = await ctx.runQuery(internal.iceIndex.authorize, { workspaceId: args.workspaceId, userId });
  if (config.namespace !== args.namespace) throw new Error('Invalid embedding space');
  const vector = indexVector(args.vector);
  const topK = Math.min(20, Math.max(1, Math.floor(args.topK ?? 5)));
  const hits = await ctx.vectorSearch('iceChunks', 'by_embedding_native', { vector, limit: topK * 4, filter: q => q.eq('namespace', config.namespace) });
  const results = await ctx.runQuery(internal.iceIndex.resolve, { workspaceId: args.workspaceId, userId, namespace: config.namespace, dimensions: args.vector.length, topK, candidates: hits.map(hit => ({ id: hit._id, score: hit._score })) });
  return { results, indexVersion: config.revision, empty: results.length === 0 };
}});
