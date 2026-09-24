import type { Doc, Id } from '../_generated/dataModel';
import type { QueryCtx, MutationCtx } from '../_generated/server';
import { internal } from '../_generated/api';
import { embeddingConfig, retainNamespace } from './embeddingConfig';
import { readCanonicalSource, RagForbiddenError } from './model';
import { isRagSourceType } from './providers';

/** An in-flight claim older than this may be taken over by another run. */
export const RECLAIM_MS = 300_000;
/** Ledger rows read per claim; bounds claim cost independently of workspace size. */
const CLAIM_SCAN = 200;
/** Ledger rows read for the pending count shown in status. */
const STATUS_SCAN = 500;

type Ctx = QueryCtx | MutationCtx;

export async function visibleSource(ctx: Ctx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, type: string, id: string) {
  // Product docs are no longer an Ice source; legacy ledger rows are ignored.
  if (!isRagSourceType(type) || type === 'docs') return null;
  try { return await readCanonicalSource(ctx, workspaceId, userId, type, id); }
  catch (error) { if (error instanceof RagForbiddenError) return null; throw error; }
}

export async function readIndexState(ctx: Ctx, namespace: string) {
  return await ctx.db.query('iceIndexState').withIndex('by_namespace', q => q.eq('namespace', namespace)).unique();
}

/** Counts for a namespace indexed before counters existed. Runs once per namespace. */
async function countNamespace(ctx: Ctx, namespace: string) {
  // Docs are no longer an Ice source, so their old rows are not counted.
  const complete = (await ctx.db.query('iceDocuments').withIndex('by_namespace_state', q => q.eq('namespace', namespace).eq('state', 'complete')).collect()).filter(doc => doc.sourceType !== 'docs');
  const failed = (await ctx.db.query('iceDocuments').withIndex('by_namespace_state', q => q.eq('namespace', namespace).eq('state', 'failed')).collect()).filter(doc => doc.sourceType !== 'docs');
  return { completeCount: complete.length, failedCount: failed.length, chunkCount: complete.reduce((sum, doc) => sum + doc.chunkCount, 0) };
}

export async function ensureIndexState(ctx: MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, namespace: string) {
  const existing = await readIndexState(ctx, namespace);
  if (existing) return existing;
  const id = await ctx.db.insert('iceIndexState', { workspaceId, userId, namespace, watermark: 0, ...await countNamespace(ctx, namespace), updatedAt: Date.now() });
  return (await ctx.db.get(id))!;
}

function tally(doc: Pick<Doc<'iceDocuments'>, 'state' | 'chunkCount'> & { sourceType?: string } | null) {
  // Legacy docs rows are never counted (see countNamespace).
  if (doc?.sourceType === 'docs') return { complete: 0, failed: 0, chunks: 0 };
  return {
    complete: doc?.state === 'complete' ? 1 : 0,
    failed: doc?.state === 'failed' ? 1 : 0,
    chunks: doc?.state === 'complete' ? doc.chunkCount : 0,
  };
}

/** Keep namespace counters in step with one document's state change. */
export async function adjustCounters(ctx: MutationCtx, namespace: string, before: Doc<'iceDocuments'> | null, after: Pick<Doc<'iceDocuments'>, 'state' | 'chunkCount'> | null) {
  const a = tally(before), b = tally(after);
  if (a.complete === b.complete && a.failed === b.failed && a.chunks === b.chunks) return;
  const state = await readIndexState(ctx, namespace);
  if (!state) return;
  await ctx.db.patch(state._id, {
    completeCount: Math.max(0, state.completeCount - a.complete + b.complete),
    failedCount: Math.max(0, state.failedCount - a.failed + b.failed),
    chunkCount: Math.max(0, state.chunkCount - a.chunks + b.chunks),
    updatedAt: Date.now(),
  });
}

type TailEntry = {
  source: Doc<'ragDocuments'>;
  content: NonNullable<Awaited<ReturnType<typeof visibleSource>>> | null;
  indexed: Doc<'iceDocuments'> | null;
  resolved: boolean;
  inFlight: boolean;
};

/**
 * Ledger rows at or after the namespace watermark, oldest first. The bound is
 * inclusive because rows written in one mutation share a timestamp. A row is
 * resolved when it is indexed or failed at its current revision, or when this
 * user cannot see it.
 */
async function scanTail(ctx: Ctx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, namespace: string, watermark: number, limit: number) {
  const rows = await ctx.db.query('ragDocuments').withIndex('by_workspace_updated', q => q.eq('workspaceId', workspaceId).gte('updatedAt', watermark)).take(limit);
  const now = Date.now();
  const entries: TailEntry[] = [];
  for (const source of rows) {
    const content = await visibleSource(ctx, workspaceId, userId, source.sourceType, source.sourceId);
    if (!content) { entries.push({ source, content, indexed: null, resolved: true, inFlight: false }); continue; }
    const indexed = await ctx.db.query('iceDocuments').withIndex('by_namespace_source', q => q.eq('namespace', namespace).eq('sourceType', source.sourceType).eq('sourceId', source.sourceId)).unique();
    const current = indexed?.sourceRevision === source.updatedAt;
    entries.push({
      source, content, indexed,
      resolved: current && (indexed!.state === 'complete' || indexed!.state === 'failed'),
      inFlight: current && indexed!.state === 'indexing' && indexed!.updatedAt > now - RECLAIM_MS,
    });
  }
  return { entries, capped: rows.length === limit };
}

/** The watermark only passes rows that are resolved, so nothing is skipped. */
function nextWatermark(current: number, entries: TailEntry[]) {
  const open = entries.find(entry => !entry.resolved);
  if (open) return open.source.updatedAt;
  return entries.length ? entries[entries.length - 1].source.updatedAt : current;
}

function newClaim() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function claimBatch(ctx: MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, namespace: string, max: number) {
  const state = await ensureIndexState(ctx, workspaceId, userId, namespace);
  const { entries } = await scanTail(ctx, workspaceId, userId, namespace, state.watermark, CLAIM_SCAN);
  const now = Date.now();
  const claimed = [];
  for (const entry of entries) {
    if (claimed.length >= max) break;
    if (entry.resolved || entry.inFlight || !entry.content) continue;
    const claim = newClaim();
    const fields = { workspaceId, userId, namespace, sourceType: entry.source.sourceType, sourceId: entry.source.sourceId, sourceRevision: entry.source.updatedAt, state: 'indexing' as const, claim, chunkCount: 0, updatedAt: now };
    let documentId: Id<'iceDocuments'>;
    if (entry.indexed) {
      documentId = entry.indexed._id;
      await ctx.db.patch(documentId, { ...fields, error: undefined });
      await adjustCounters(ctx, namespace, entry.indexed, fields);
    } else {
      documentId = await ctx.db.insert('iceDocuments', fields);
    }
    claimed.push({ documentId, claim, sourceType: entry.source.sourceType, sourceId: entry.source.sourceId, title: entry.content.title, text: entry.content.text, anchor: entry.content.anchor });
  }
  const watermark = nextWatermark(state.watermark, entries);
  if (watermark !== state.watermark) await ctx.db.patch(state._id, { watermark, updatedAt: now });
  return claimed;
}

/** Put this namespace's failed sources back in the queue. */
export async function requeueFailed(ctx: MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>, namespace: string) {
  const state = await ensureIndexState(ctx, workspaceId, userId, namespace);
  const failed = await ctx.db.query('iceDocuments').withIndex('by_namespace_state', q => q.eq('namespace', namespace).eq('state', 'failed')).take(100);
  let watermark = state.watermark;
  for (const doc of failed) {
    watermark = Math.min(watermark, doc.sourceRevision);
    const chunks = await ctx.db.query('iceChunks').withIndex('by_document', q => q.eq('documentId', doc._id)).collect();
    for (const chunk of chunks) await ctx.db.delete(chunk._id);
    await ctx.db.delete(doc._id);
  }
  if (failed.length) {
    await ctx.db.patch(state._id, { watermark, failedCount: Math.max(0, state.failedCount - failed.length), updatedAt: Date.now() });
  }
  return failed.length;
}

export async function personalStatus(ctx: Ctx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const config = await embeddingConfig(ctx, workspaceId, userId);
  const state = await readIndexState(ctx, config.namespace);
  const counts = state ?? await countNamespace(ctx, config.namespace);
  const { entries, capped } = await scanTail(ctx, workspaceId, userId, config.namespace, state?.watermark ?? 0, STATUS_SCAN);
  const pendingCount = entries.filter(entry => !entry.resolved).length;
  const failed = (await ctx.db.query('iceDocuments').withIndex('by_namespace_state', q => q.eq('namespace', config.namespace).eq('state', 'failed')).take(10)).filter(doc => doc.sourceType !== 'docs').slice(0, 5);
  const recentErrors = failed.map(doc => ({ sourceType: doc.sourceType, sourceId: doc.sourceId, error: doc.error ?? 'Indexing failed' }));
  return {
    ...config,
    indexVersion: config.revision,
    embeddingModel: config.model,
    embeddingVersion: config.namespace,
    completeCount: counts.completeCount,
    failedCount: counts.failedCount,
    chunkCount: counts.chunkCount,
    pendingCount,
    pendingCapped: capped && pendingCount > 0,
    retainedCount: config.retained.length,
    recentErrors,
    lastRunError: state?.lastRunError ?? null,
    lastRunAt: state?.lastRunAt ?? null,
    updatedAt: state?.updatedAt ?? null,
  };
}

export async function deletePersonalSource(ctx: MutationCtx, workspaceId: Id<'workspaces'>, sourceType: string, sourceId: string) {
  const documents = await ctx.db.query('iceDocuments').withIndex('by_workspace_source', q => q.eq('workspaceId', workspaceId).eq('sourceType', sourceType).eq('sourceId', sourceId)).collect();
  for (const doc of documents) {
    const chunks = await ctx.db.query('iceChunks').withIndex('by_document', q => q.eq('documentId', doc._id)).collect();
    for (const chunk of chunks) await ctx.db.delete(chunk._id);
    await ctx.db.delete(doc._id);
    await adjustCounters(ctx, doc.namespace, doc, null);
  }
}

/**
 * Start a fresh index in a new namespace for this user. The replaced
 * namespace stays searchable; namespaces beyond the retention limit are purged.
 */
export async function reindexPersonal(ctx: MutationCtx, workspaceId: Id<'workspaces'>, userId: Id<'users'>) {
  const prefs = await ctx.db.query('icePreferences').withIndex('by_workspace_user', q => q.eq('workspaceId', workspaceId).eq('userId', userId)).unique();
  const config = await embeddingConfig(ctx, workspaceId, userId);
  const { retained, dropped } = retainNamespace(config);
  const fields = { embeddingRevision: config.revision + 1, retainedEmbeddings: retained, updatedAt: Date.now() };
  if (prefs) await ctx.db.patch(prefs._id, fields);
  else await ctx.db.insert('icePreferences', { workspaceId, userId, chatProvider: 'local', chatModel: 'local-grounded', ...fields });
  for (const namespace of dropped) await ctx.scheduler.runAfter(0, internal.iceIndex.purgeNamespace, { namespace });
  return { revision: config.revision + 1, retainedCount: retained.length };
}
