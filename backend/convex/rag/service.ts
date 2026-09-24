/**
 * Ice RAG — business rules and orchestration.
 *
 * Service owns invariants; models own `ctx.db`. Indexing triggers call
 * `markRagPending` / `removeRagSource` from inside the tracked domain
 * mutations so every browser and MCP write marks the index in the same work
 * unit. Embedding itself runs in the Next.js worker (Convex cannot load
 * native ONNX modules); deletions and permission checks stay synchronous in
 * Convex so they are effective immediately.
 */

import type { Id } from "../_generated/dataModel";
import { deletePersonalSource } from './personal';
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { requireMembershipForUser, requireWorkspaceRoleForUser } from "../lib/auth";
import { ragContentHash } from "./chunk";
import {
  getRagDocument,
  getWorkspaceRagState,
  listActiveChunksForSource,
  ragStatusDto,
  readCanonicalSource,
  RagForbiddenError,
  type CanonicalSource,
  type RagStatusDto,
} from "./model";
import {
  RAG_EMBEDDING_DIMENSIONS,
  RAG_EMBEDDING_MODEL,
  RAG_EMBEDDING_VERSION,
  RAG_MIN_SCORE,
  RAG_RETRIEVAL_TOP_K_DEFAULT,
  RAG_RETRIEVAL_TOP_K_MAX,
  isRagSourceType,
  type RagSourceType,
  type RetrievedChunk,
} from "./providers";

type SvcCtx = QueryCtx | MutationCtx;

export class RagVectorError extends Error {
  constructor(message = "Invalid query vector") {
    super(message);
    this.name = "RagVectorError";
  }
}

async function ensureWorkspaceState(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
) {
  const existing = await getWorkspaceRagState(ctx, workspaceId);
  if (existing !== null) return existing;
  const now = Date.now();
  const id = await ctx.db.insert("ragWorkspaceState", {
    workspaceId,
    indexVersion: 1,
    embeddingModel: RAG_EMBEDDING_MODEL,
    embeddingVersion: RAG_EMBEDDING_VERSION,
    pendingCount: 0,
    updatedAt: now,
  });
  const created = await ctx.db.get(id);
  if (created === null) throw new Error("Failed to create RAG workspace state");
  return created;
}

async function bumpIndexVersion(ctx: MutationCtx, workspaceId: Id<"workspaces">) {
  const state = await ensureWorkspaceState(ctx, workspaceId);
  await ctx.db.patch(state._id, {
    indexVersion: state.indexVersion + 1,
    updatedAt: Date.now(),
  });
  return state.indexVersion + 1;
}

/**
 * Flag one source for (re)indexing. Called from tracked domain mutations.
 * Never throws for missing membership — callers prove membership first.
 * Wrapped by callers in try/catch so RAG bookkeeping can never break a
 * product write; the sweep reconciles anything missed.
 */export async function markRagPending(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
) {
  const state = await ensureWorkspaceState(ctx, workspaceId);
  const existing = await getRagDocument(ctx, workspaceId, sourceType, sourceId);
  if (existing === null) {
    await ctx.db.insert("ragDocuments", {
      workspaceId,
      sourceType,
      sourceId,
      contentVersion: "",
      contentHash: "",
      indexStatus: "pending",
      embeddingModel: RAG_EMBEDDING_MODEL,
      embeddingVersion: RAG_EMBEDDING_VERSION,
      chunkCount: 0,
      updatedAt: Date.now(),
    });
    await ctx.db.patch(state._id, {
      pendingCount: state.pendingCount + 1,
      updatedAt: Date.now(),
    });
  } else if (existing.indexStatus === "complete" || existing.indexStatus === "failed") {
    await ctx.db.patch(existing._id, { indexStatus: "pending", updatedAt: Date.now() });
    const fresh = await getWorkspaceRagState(ctx, workspaceId);
    if (fresh !== null) {
      await ctx.db.patch(fresh._id, {
        pendingCount: fresh.pendingCount + 1,
        updatedAt: Date.now(),
      });
    }
  } else {
    await ctx.db.patch(existing._id, { updatedAt: Date.now() });
  }
  await bumpIndexVersion(ctx, workspaceId);
}

/** Remove every index row for one source. Runs inside the deleting mutation,
 * so deletion propagates synchronously — never eventually. */
export async function removeRagSource(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
) {
  await deletePersonalSource(ctx, workspaceId, sourceType, sourceId);
  const existing = await getRagDocument(ctx, workspaceId, sourceType, sourceId);
  if (existing === null) return;
  const chunks = await listActiveChunksForSource(ctx, existing._id);
  for (const chunk of chunks) {
    await ctx.db.delete(chunk._id);
  }
  const wasPending =
    existing.indexStatus === "pending" || existing.indexStatus === "indexing";
  await ctx.db.delete(existing._id);
  const state = await getWorkspaceRagState(ctx, workspaceId);
  if (state !== null) {
    await ctx.db.patch(state._id, {
      pendingCount: Math.max(0, state.pendingCount - (wasPending ? 1 : 0)),
      updatedAt: Date.now(),
    });
  }
  await bumpIndexVersion(ctx, workspaceId);
}

/**
 * Never-break wrappers for domain-mutation call sites. RAG bookkeeping must
 * not fail a product write; failures are logged with ids only (no content)
 * and recovered by the worker claim path plus the hourly sweep.
 */
export async function trackRagUpsert(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
) {
  try {
    await markRagPending(ctx, workspaceId, sourceType, sourceId);
  } catch (error) {
    console.warn(
      `rag track upsert failed ${sourceType}:${sourceId}`,
      error instanceof Error ? error.message : "unknown",
    );
  }
}

export async function trackRagRemoval(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
) {
  try {
    await removeRagSource(ctx, workspaceId, sourceType, sourceId);
  } catch (error) {
    console.warn(
      `rag track removal failed ${sourceType}:${sourceId}`,
      error instanceof Error ? error.message : "unknown",
    );
  }
}

export type PendingRagDocument = {
  id: Id<"ragDocuments">;
  sourceType: RagSourceType;
  sourceId: string;
  contentVersion: string;
  contentHash: string;
};

/** Worker claim: oldest pending document becomes indexing (single-flight). */
export async function claimNextPending(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
): Promise<PendingRagDocument | null> {
  const pending = await ctx.db
    .query("ragDocuments")
    .withIndex("by_workspace_status", (q) =>
      q.eq("workspaceId", workspaceId).eq("indexStatus", "pending"),
    )
    .collect();
  if (pending.length < 1) return null;
  pending.sort((a, b) => a.updatedAt - b.updatedAt);
  const doc = pending[0];
  await ctx.db.patch(doc._id, { indexStatus: "indexing", updatedAt: Date.now() });
  return {
    id: doc._id,
    sourceType: doc.sourceType as RagSourceType,
    sourceId: doc.sourceId,
    contentVersion: doc.contentVersion,
    contentHash: doc.contentHash,
  };
}

export type RagChunkWrite = {
  ordinal: number;
  text: string;
  textHash: string;
  anchor: string;
  title: string;
  embedding: number[];
};

/**
 * Staged-version swap: the worker writes a complete new version, then the old
 * rows are removed inside the same mutation. Readers never see partial data.
 * Rejects vectors from another model/dimension outright.
 */
export async function writeChunkVersion(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
  contentVersion: string,
  contentHash: string,
  chunks: RagChunkWrite[],
) {
  const doc = await getRagDocument(ctx, workspaceId, sourceType, sourceId);
  if (doc === null || doc.indexStatus !== "indexing") {
    throw new Error("RAG document is not claimed for indexing");
  }
  for (const chunk of chunks) {
    if (
      !Array.isArray(chunk.embedding) ||
      chunk.embedding.length !== RAG_EMBEDDING_DIMENSIONS ||
      chunk.embedding.some((value) => typeof value !== "number" || !Number.isFinite(value))
    ) {
      throw new RagVectorError(
        `Chunk ${chunk.ordinal} must carry exactly ${RAG_EMBEDDING_DIMENSIONS} finite embedding values`,
      );
    }
  }
  const oldChunks = await listActiveChunksForSource(ctx, doc._id);
  const now = Date.now();
  const state = await ensureWorkspaceState(ctx, workspaceId);
  for (const chunk of chunks) {
    await ctx.db.insert("ragChunks", {
      workspaceId,
      documentId: doc._id,
      sourceType,
      sourceId,
      sourceAnchor: chunk.anchor,
      title: chunk.title,
      ordinal: chunk.ordinal,
      text: chunk.text,
      textHash: chunk.textHash,
      embedding: chunk.embedding,
      embeddingModel: RAG_EMBEDDING_MODEL,
      embeddingVersion: RAG_EMBEDDING_VERSION,
      version: state.indexVersion,
      isActive: true,
      createdAt: now,
    });
  }
  for (const old of oldChunks) {
    await ctx.db.delete(old._id);
  }
  await ctx.db.patch(doc._id, {
    contentVersion,
    contentHash,
    indexStatus: "complete",
    chunkCount: chunks.length,
    error: undefined,
    updatedAt: now,
  });
  await ctx.db.patch(state._id, {
    pendingCount: Math.max(0, state.pendingCount - 1),
    updatedAt: now,
  });
  await bumpIndexVersion(ctx, workspaceId);
}

/**
 * Content-hash skip: the worker found identical bytes, so the existing
 * complete version stands. Restores `complete` without touching chunks and
 * releases the pending count. This is caching layer 1 — unchanged sources
 * are never re-embedded.
 */
export async function confirmUnchangedVersion(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
  contentVersion: string,
) {
  const doc = await getRagDocument(ctx, workspaceId, sourceType, sourceId);
  if (doc === null || doc.indexStatus !== "indexing") {
    throw new Error("RAG document is not claimed for indexing");
  }
  if (doc.contentVersion !== contentVersion) {
    throw new Error("Content version changed during indexing");
  }
  await ctx.db.patch(doc._id, { indexStatus: "complete", updatedAt: Date.now() });
  const state = await getWorkspaceRagState(ctx, workspaceId);
  if (state !== null) {
    await ctx.db.patch(state._id, {
      pendingCount: Math.max(0, state.pendingCount - 1),
      updatedAt: Date.now(),
    });
  }
}

export async function markIndexFailed(  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  sourceType: RagSourceType,
  sourceId: string,
  error: string,
) {
  const doc = await getRagDocument(ctx, workspaceId, sourceType, sourceId);
  if (doc === null) return;
  const wasActive = doc.indexStatus === "pending" || doc.indexStatus === "indexing";
  await ctx.db.patch(doc._id, {
    indexStatus: "failed",
    error: error.slice(0, 500),
    updatedAt: Date.now(),
  });
  const state = await getWorkspaceRagState(ctx, workspaceId);
  if (state !== null && wasActive) {
    await ctx.db.patch(state._id, {
      pendingCount: Math.max(0, state.pendingCount - 1),
      updatedAt: Date.now(),
    });
  }
}

export function validateVector(vector: unknown): asserts vector is number[] {
  if (
    !Array.isArray(vector) ||
    vector.length !== RAG_EMBEDDING_DIMENSIONS ||
    vector.some((value) => typeof value !== "number" || !Number.isFinite(value))
  ) {
    throw new RagVectorError(
      `Query vector must be an array of ${RAG_EMBEDDING_DIMENSIONS} finite numbers from ${RAG_EMBEDDING_MODEL}`,
    );
  }
}

export type RetrieveOptions = {
  vector: number[];
  topK?: number;
  minScore?: number;
  sourceTypes?: RagSourceType[];
};

export type RetrieveResult = {
  results: RetrievedChunk[];
  indexVersion: number;
  empty: boolean;
};

export type ScoredCandidate = {
  id: Id<"ragChunks">;
  score: number;
};

/**
 * Defense in depth: every candidate is re-checked here even though the
 * vector query already filters by workspace. Tenant, active-version,
 * source-type, threshold, and live-permission rules are enforced in this
 * one place so tests can prove them without a live HNSW index.
 */
export async function rankCandidates(
  ctx: SvcCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  candidates: ScoredCandidate[],
  options: { topK: number; minScore: number; allowedTypes: Set<string> | null },
): Promise<RetrievedChunk[]> {
  const ordered = [...candidates].sort((a, b) => b.score - a.score);
  const results: RetrievedChunk[] = [];
  for (const candidate of ordered) {
    if (results.length >= options.topK) break;
    if (candidate.score < options.minScore) continue;
    const row = await ctx.db.get(candidate.id);
    if (row === null || !row.isActive) continue;
    if (row.workspaceId !== workspaceId) continue;
    if (options.allowedTypes !== null && !options.allowedTypes.has(row.sourceType)) continue;
    if (row.sourceType === "docs") {
      // Static product docs: membership was proven by the caller, and the
      // title travels with the chunk row since there is no live source.
      results.push({
        text: row.text,
        score: candidate.score,
        sourceType: "docs",
        sourceId: row.sourceId,
        anchor: row.sourceAnchor,
        title: row.title,
        target: { page: "docs" },
      });
      continue;
    }
    let source: CanonicalSource;
    try {
      const found = await readCanonicalSource(
        ctx,
        workspaceId,
        userId,
        row.sourceType as RagSourceType,
        row.sourceId,
      );
      if (found === null) continue;
      source = found;
    } catch (error) {
      if (error instanceof RagForbiddenError) continue;
      throw error;
    }
    results.push({
      text: row.text,
      score: candidate.score,
      sourceType: row.sourceType as RagSourceType,
      sourceId: row.sourceId,
      anchor: row.sourceAnchor,
      title: source.title,
      target: source.target,
    });
  }
  return results;
}

/**
 * Tenant-filtered vector retrieval. The workspace filter runs inside the
 * vector query; every candidate is then re-checked against live source
 * permissions (private tasks/events, deleted sources) before it can appear.
 */
export async function resolveCandidatesForActor(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  candidates: ScoredCandidate[],
  options: Omit<RetrieveOptions, "vector">,
  membershipProven = false,
): Promise<RetrieveResult> {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  const topK = Math.min(
    Math.max(1, Math.floor(options.topK ?? RAG_RETRIEVAL_TOP_K_DEFAULT)),
    RAG_RETRIEVAL_TOP_K_MAX,
  );
  const minScore = options.minScore ?? RAG_MIN_SCORE;
  const allowedTypes =
    options.sourceTypes && options.sourceTypes.length > 0
      ? new Set<string>(options.sourceTypes.filter(isRagSourceType))
      : null;
  const state = await getWorkspaceRagState(ctx, workspaceId);
  const results = await rankCandidates(
    ctx,
    workspaceId,
    userId,
    candidates,
    { topK, minScore, allowedTypes },
  );
  return {
    results,
    indexVersion: state?.indexVersion ?? 1,
    empty: results.length < 1,
  };
}

export async function ragStatusForActor(
  ctx: SvcCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  membershipProven = false,
): Promise<RagStatusDto> {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  return await ragStatusDto(ctx, workspaceId, RAG_EMBEDDING_MODEL, RAG_EMBEDDING_VERSION);
}

export async function submitFeedbackForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
  input: { question: string; rating: "up" | "down"; reason?: string },
  membershipProven = false,
) {
  if (!membershipProven) {
    await requireMembershipForUser(ctx, workspaceId, userId);
  }
  if (input.question.trim().length < 1 || input.question.length > 2000) {
    throw new Error("Feedback question must be 1-2000 characters");
  }
  const reason = input.reason?.slice(0, 500);
  await ctx.db.insert("ragFeedback", {
    workspaceId,
    userId,
    questionHash: ragContentHash(input.question),
    rating: input.rating,
    reason,
    createdAt: Date.now(),
  });
  return { ok: true };
}

/** Flag every known source for reindexing. ADMIN+ only: full-workspace cost. */
export async function reindexWorkspaceForActor(
  ctx: MutationCtx,
  workspaceId: Id<"workspaces">,
  userId: Id<"users">,
) {
  await requireWorkspaceRoleForUser(ctx, workspaceId, userId, "ADMIN");
  const docs = await ctx.db
    .query("ragDocuments")
    .withIndex("by_workspace_status", (q) => q.eq("workspaceId", workspaceId))
    .collect();
  const now = Date.now();
  for (const doc of docs) {
    await ctx.db.patch(doc._id, { indexStatus: "pending", updatedAt: now });
  }
  const state = await ensureWorkspaceState(ctx, workspaceId);
  await ctx.db.patch(state._id, { pendingCount: docs.length, updatedAt: now });
  await bumpIndexVersion(ctx, workspaceId);
  return { queued: docs.length };
}

/**
 * Safety-net sweep: documents stuck in indexing return to pending, and the
 * pending counter is recomputed exactly. Runs hourly from crons.ts.
 */
export async function sweepStaleDocuments(ctx: MutationCtx, olderThanMs: number) {
  const cutoff = Date.now() - olderThanMs;
  const indexing = await ctx.db.query("ragDocuments").collect();
  let reset = 0;
  for (const doc of indexing) {
    if (doc.indexStatus === "indexing" && doc.updatedAt < cutoff) {
      await ctx.db.patch(doc._id, { indexStatus: "pending", updatedAt: Date.now() });
      reset += 1;
    }
  }
  const workspaces = await ctx.db.query("ragWorkspaceState").collect();
  for (const state of workspaces) {
    const pending = await ctx.db
      .query("ragDocuments")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", state.workspaceId).eq("indexStatus", "pending"),
      )
      .collect();
    const active = await ctx.db
      .query("ragDocuments")
      .withIndex("by_workspace_status", (q) =>
        q.eq("workspaceId", state.workspaceId).eq("indexStatus", "indexing"),
      )
      .collect();
    await ctx.db.patch(state._id, {
      pendingCount: pending.length + active.length,
      updatedAt: Date.now(),
    });
  }
  return { reset };
}
