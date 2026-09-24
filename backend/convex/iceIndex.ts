import { v } from 'convex/values';
import { paginationOptsValidator } from 'convex/server';
import { getAuthUserId } from '@convex-dev/auth/server';
import { action, internalMutation, internalQuery, mutation, query, type ActionCtx } from './_generated/server';
import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { requireMembership, requireMembershipForUser } from './lib/auth';
import { tasklabsRateLimiter } from './lib/rateLimits';
import { embeddingConfig } from './rag/embeddingConfig';
import { indexVector } from './rag/embeddingModels';
import { adjustCounters, claimBatch as claimSources, ensureIndexState, personalStatus, readIndexState, reindexPersonal, requeueFailed, visibleSource } from './rag/personal';
import { expandNeighbours } from './rag/neighbours';
import { completeWorkspaceSourceSync, seedMissingRagSources } from './rag/service';
import { RAG_MIN_SCORE, RAG_SOURCE_SYNC_VERSION, isRagSourceType, type RetrievedChunk } from './rag/providers';

const workspaceId = v.id('workspaces');
export const config = query({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  return await embeddingConfig(ctx, args.workspaceId, userId);
}});
export const status = query({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  return await personalStatus(ctx, args.workspaceId, userId);
}});

export const beginIndex = mutation({ args: { workspaceId, retryFailed: v.optional(v.boolean()) }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  await tasklabsRateLimiter.limit(ctx, 'ragIndex', { key: `${userId}:${args.workspaceId}`, throws: true });
  const config = await embeddingConfig(ctx, args.workspaceId, userId);
  const requeued = args.retryFailed ? await requeueFailed(ctx, args.workspaceId, userId, config.namespace) : 0;
  return { ok: true, requeued };
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

const MAX_CLAIM_BATCH = 16;

export const claimBatch = mutation({ args: { workspaceId, namespace: v.string(), max: v.optional(v.number()) }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const config = await embeddingConfig(ctx, args.workspaceId, userId);
  if (config.namespace !== args.namespace) throw new Error('Embedding selection changed; retry indexing');
  const max = Math.min(MAX_CLAIM_BATCH, Math.max(1, Math.floor(args.max ?? MAX_CLAIM_BATCH)));
  return await claimSources(ctx, args.workspaceId, userId, config.namespace, max);
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
  const next = { state: 'complete' as const, chunkCount: args.chunks.length };
  await ctx.db.patch(doc._id, { ...next, error: undefined, updatedAt: Date.now() });
  await adjustCounters(ctx, doc.namespace, doc, next);
  return { ok: true };
}});

export const failed = mutation({ args: { workspaceId, documentId: v.id('iceDocuments'), claim: v.string(), error: v.string() }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const doc = await ctx.db.get(args.documentId);
  if (!doc || doc.userId !== userId || doc.workspaceId !== args.workspaceId || doc.claim !== args.claim) return;
  const next = { state: 'failed' as const, chunkCount: doc.chunkCount };
  await ctx.db.patch(doc._id, { state: 'failed', error: args.error.slice(0, 300), updatedAt: Date.now() });
  await adjustCounters(ctx, doc.namespace, doc, next);
}});

/** Record the outcome of a whole index run; a clean run clears the last error. */
export const recordRun = mutation({ args: { workspaceId, error: v.optional(v.string()) }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  const config = await embeddingConfig(ctx, args.workspaceId, userId);
  const state = await ensureIndexState(ctx, args.workspaceId, userId, config.namespace);
  const now = Date.now();
  await ctx.db.patch(state._id, { lastRunError: args.error?.slice(0, 300), lastRunAt: now, updatedAt: now });
}});

/** Start a fresh index; the replaced namespace stays searchable. */
export const reindex = mutation({ args: { workspaceId }, handler: async (ctx, args) => {
  const { userId } = await requireMembership(ctx, args.workspaceId);
  await reindexPersonal(ctx, args.workspaceId, userId);
  return { ok: true };
}});

/** Delete one namespace's chunks, documents and state in bounded batches. */
export const purgeNamespace = internalMutation({ args: { namespace: v.string() }, handler: async (ctx, args) => {
  const chunks = await ctx.db.query('iceChunks').withIndex('by_namespace', q => q.eq('namespace', args.namespace)).take(200);
  for (const chunk of chunks) await ctx.db.delete(chunk._id);
  const docs = chunks.length < 200 ? await ctx.db.query('iceDocuments').withIndex('by_namespace_source', q => q.eq('namespace', args.namespace)).take(200) : [];
  for (const doc of docs) await ctx.db.delete(doc._id);
  if (chunks.length === 200 || docs.length === 200) {
    await ctx.scheduler.runAfter(0, internal.iceIndex.purgeNamespace, args);
    return;
  }
  const state = await readIndexState(ctx, args.namespace);
  if (state) await ctx.db.delete(state._id);
}});

export const authorize = internalQuery({ args: { workspaceId, userId: v.id('users') }, handler: async (ctx, args) => {
  await requireMembershipForUser(ctx, args.workspaceId, args.userId);
  return await embeddingConfig(ctx, args.workspaceId, args.userId);
}});

const MAX_CHUNKS_PER_SOURCE = 2;
const RRF_K = 60;
const KEYWORD_HITS_PER_TABLE = 3;
const KEYWORD_TEXT_CHARS = 1200;
const STOPWORDS = new Set(['a', 'an', 'and', 'any', 'are', 'about', 'all', 'as', 'at', 'be', 'by', 'can', 'do', 'does', 'for', 'from', 'give', 'has', 'have', 'how', 'i', 'in', 'is', 'it', 'me', 'my', 'of', 'on', 'or', 'show', 'tell', 'that', 'the', 'there', 'this', 'to', 'us', 'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'with', 'you', 'your']);

/** Content words of the question, for the title search indexes. */
export function keywordQuery(text: string): string {
  return text.toLowerCase().split(/[^a-z0-9#]+/).filter(word => word.length > 1 && !STOPWORDS.has(word)).slice(0, 12).join(' ');
}

const candidateArg = v.object({ id: v.id('iceChunks'), score: v.number(), dimensions: v.number() });

/**
 * Rank retrieval results: vector hits (best first, at most two chunks per
 * source, fresh and visible only) are fused with title keyword hits by
 * reciprocal rank fusion, then expanded one hop along record links.
 */
export const resolve = internalQuery({ args: { workspaceId, userId: v.id('users'), text: v.string(), candidates: v.array(candidateArg), topK: v.number() }, handler: async (ctx, args): Promise<RetrievedChunk[]> => {
  await requireMembershipForUser(ctx, args.workspaceId, args.userId);
  const config = await embeddingConfig(ctx, args.workspaceId, args.userId);
  const allowed = new Set([config.namespace, ...config.retained.map(entry => entry.namespace)]);
  const visible = new Map<string, Awaited<ReturnType<typeof visibleSource>>>();
  const sourceFor = async (type: string, id: string) => {
    const key = `${type}:${id}`;
    if (!visible.has(key)) visible.set(key, await visibleSource(ctx, args.workspaceId, args.userId, type, id));
    return visible.get(key)!;
  };

  const vectorGroups = new Map<string, RetrievedChunk[]>();
  const seenChunks = new Set<string>();
  const sorted = [...args.candidates].sort((a, b) => b.score - a.score);
  for (const candidate of sorted) {
    if (candidate.score < RAG_MIN_SCORE || vectorGroups.size >= args.topK * 2) break;
    const chunk = await ctx.db.get(candidate.id);
    if (!chunk || chunk.userId !== args.userId || chunk.workspaceId !== args.workspaceId || !allowed.has(chunk.namespace)) continue;
    if (chunk.embedding.length !== candidate.dimensions) throw new Error('Provider embedding dimensions changed. Reindex your sources.');
    const doc = await ctx.db.get(chunk.documentId);
    if (!doc || doc.state !== 'complete' || !isRagSourceType(doc.sourceType)) continue;
    // Chunks from any namespace are used only while they match the live record.
    const ledger = await ctx.db.query('ragDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', args.workspaceId).eq('sourceType', doc.sourceType as 'task').eq('sourceId', doc.sourceId)).unique();
    if (!ledger || ledger.updatedAt !== doc.sourceRevision) continue;
    const source = await sourceFor(doc.sourceType, doc.sourceId);
    if (!source) continue;
    const chunkKey = `${chunk.anchor}|${chunk.text}`;
    if (seenChunks.has(chunkKey)) continue;
    const key = `${doc.sourceType}:${doc.sourceId}`;
    const group = vectorGroups.get(key) ?? [];
    if (group.length >= MAX_CHUNKS_PER_SOURCE) continue;
    seenChunks.add(chunkKey);
    group.push({ text: chunk.text, title: chunk.title, anchor: chunk.anchor, sourceType: doc.sourceType, sourceId: doc.sourceId, score: candidate.score, target: source.target });
    vectorGroups.set(key, group);
  }

  const keywordOrder: string[] = [];
  const keywordOnly = new Map<string, RetrievedChunk>();
  const terms = keywordQuery(args.text);
  if (terms) {
    const tables = [
      { sourceType: 'task' as const, rows: await ctx.db.query('tasks').withSearchIndex('search_title', q => q.search('title', terms).eq('workspaceId', args.workspaceId)).take(KEYWORD_HITS_PER_TABLE) },
      { sourceType: 'project' as const, rows: await ctx.db.query('projects').withSearchIndex('search_title', q => q.search('title', terms).eq('workspaceId', args.workspaceId)).take(KEYWORD_HITS_PER_TABLE) },
      { sourceType: 'event' as const, rows: await ctx.db.query('calendarEvents').withSearchIndex('search_title', q => q.search('title', terms).eq('workspaceId', args.workspaceId)).take(KEYWORD_HITS_PER_TABLE) },
    ];
    for (const { sourceType, rows } of tables) {
      for (const row of rows) {
        const source = await sourceFor(sourceType, row._id);
        if (!source) continue;
        const key = `${sourceType}:${row._id}`;
        keywordOrder.push(key);
        if (!vectorGroups.has(key)) keywordOnly.set(key, { text: source.text.slice(0, KEYWORD_TEXT_CHARS), title: source.title, anchor: source.anchor, sourceType, sourceId: row._id, score: 0, target: source.target });
      }
    }
  }

  const fused = new Map<string, number>();
  [...vectorGroups.keys()].forEach((key, rank) => fused.set(key, (fused.get(key) ?? 0) + 1 / (RRF_K + rank + 1)));
  keywordOrder.forEach((key, rank) => fused.set(key, (fused.get(key) ?? 0) + 1 / (RRF_K + rank + 1)));
  const ranked = [...fused.entries()].sort((a, b) => b[1] - a[1]).slice(0, args.topK).map(([key]) => key);
  const primary = ranked.flatMap(key => vectorGroups.get(key) ?? [keywordOnly.get(key)!]);
  return [...primary, ...await expandNeighbours(ctx, args.workspaceId, args.userId, primary)];
}});

export type NamespaceSearch = { namespace: string; vector: number[] };
export type SearchResult = { results: RetrievedChunk[]; indexVersion: number; empty: boolean };

/**
 * Vector search over the caller's current and retained namespaces, then
 * ranking and neighbour expansion in `resolve`. Shared by the browser
 * worker (`retrieve`) and MCP. Vector search only runs in actions.
 */
export async function searchNamespaces(ctx: ActionCtx, args: { workspaceId: Id<'workspaces'>; userId: Id<'users'>; text: string; searches: NamespaceSearch[]; topK?: number }): Promise<SearchResult> {
  const config = await ctx.runQuery(internal.iceIndex.authorize, { workspaceId: args.workspaceId, userId: args.userId });
  const allowed = new Set([config.namespace, ...config.retained.map(entry => entry.namespace)]);
  if (!args.searches.length || args.searches.length > allowed.size || args.searches.some(search => !allowed.has(search.namespace))) throw new Error('Invalid embedding space');
  const topK = Math.min(20, Math.max(1, Math.floor(args.topK ?? 5)));
  const candidates: { id: Id<'iceChunks'>; score: number; dimensions: number }[] = [];
  for (const search of args.searches) {
    const hits = await ctx.vectorSearch('iceChunks', 'by_embedding_native', { vector: indexVector(search.vector), limit: topK * 4, filter: q => q.eq('namespace', search.namespace) });
    candidates.push(...hits.map(hit => ({ id: hit._id, score: hit._score, dimensions: search.vector.length })));
  }
  const results = await ctx.runQuery(internal.iceIndex.resolve, { workspaceId: args.workspaceId, userId: args.userId, text: args.text.slice(0, 2000), topK, candidates });
  return { results, indexVersion: config.revision, empty: results.length === 0 };
}

export const retrieve = action({ args: {
  workspaceId,
  text: v.string(),
  searches: v.array(v.object({ namespace: v.string(), vector: v.array(v.number()) })),
  topK: v.optional(v.number()),
}, handler: async (ctx, args): Promise<SearchResult> => {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error('Unauthorized');
  await tasklabsRateLimiter.limit(ctx, 'ragQuery', { key: userId, throws: true });
  return await searchNamespaces(ctx, { ...args, userId });
}});
