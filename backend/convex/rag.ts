/**
 * Ice RAG — public Convex functions (thin: validate, authorize, call service).
 *
 * Retrieval runs as a query (Convex supports vector search in queries).
 * Heavy work (embeddings, generation) runs in the Next.js `/api/ice` route —
 * Convex functions cannot load native ONNX modules — and calls these
 * functions with pre-computed vectors.
 */

import { v } from "convex/values";
import {
  action,
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";
import { buildExtractiveAnswer } from "./rag/answer";
import { requireMembership } from "./lib/auth";
import { tasklabsRateLimiter } from "./lib/rateLimits";
import {
  claimNextPending,
  confirmUnchangedVersion,
  markIndexFailed,
  markRagPending,
  ragStatusForActor,
  reindexWorkspaceForActor,
  resolveCandidatesForActor,
  removeRagSource,
  submitFeedbackForActor,
  sweepStaleDocuments,
  writeChunkVersion,
  validateVector,
  type RetrieveResult,
} from "./rag/service";
import { getRagDocument, readCanonicalSourceForIndex } from "./rag/model";
import {
  RAG_EMBEDDING_DIMENSIONS,
  isRagSourceType,
  type RagCitation,
} from "./rag/providers";
import type { ActionCtx } from "./_generated/server";

const workspaceIdArg = v.id("workspaces");
const ragSourceType = v.union(
  v.literal("task"),
  v.literal("taskComment"),
  v.literal("project"),
  v.literal("projectUpdate"),
  v.literal("event"),
  v.literal("docs"),
);
const vectorArg = v.array(v.number());

export const status = query({
  args: { workspaceId: workspaceIdArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    return await ragStatusForActor(ctx, args.workspaceId, userId, true);
  },
});

type ActionRetrieveArgs = {
  workspaceId: import("./_generated/dataModel").Id<"workspaces">;
  userId: import("./_generated/dataModel").Id<"users">;
  vector: number[];
  topK?: number;
  minScore?: number;
  sourceTypes?: Array<"task" | "taskComment" | "project" | "projectUpdate" | "event" | "docs">;
};

type ActionAskResult = RetrieveResult & { answer: string; citations: RagCitation[] };

async function retrieveInAction(ctx: ActionCtx, args: ActionRetrieveArgs): Promise<RetrieveResult> {
  validateVector(args.vector);
  const topK = Math.min(Math.max(1, Math.floor(args.topK ?? 5)), 20);
  const candidates = await ctx.vectorSearch("ragChunks", "by_embedding", {
    vector: args.vector,
    limit: topK * 3,
    filter: q => q.eq("workspaceId", args.workspaceId),
  });
  return await ctx.runQuery(internal.rag.resolveCandidates, {
    workspaceId: args.workspaceId,
    userId: args.userId,
    candidates: candidates.map(candidate => ({ id: candidate._id, score: candidate._score })),
    topK: args.topK,
    minScore: args.minScore,
    sourceTypes: args.sourceTypes,
  });
}

export const resolveCandidates = internalQuery({
  args: {
    workspaceId: workspaceIdArg,
    userId: v.id("users"),
    candidates: v.array(v.object({ id: v.id("ragChunks"), score: v.number() })),
    topK: v.optional(v.number()),
    minScore: v.optional(v.number()),
    sourceTypes: v.optional(v.array(ragSourceType)),
  },
  handler: async (ctx, args): Promise<RetrieveResult> =>
    await resolveCandidatesForActor(ctx, args.workspaceId, args.userId, args.candidates, {
      topK: args.topK,
      minScore: args.minScore,
      sourceTypes: args.sourceTypes,
    }),
});

export const retrieve = action({
  args: {
    workspaceId: workspaceIdArg,
    vector: vectorArg,
    topK: v.optional(v.number()),
    minScore: v.optional(v.number()),
    sourceTypes: v.optional(v.array(ragSourceType)),
  },
  handler: async (ctx, args): Promise<RetrieveResult> => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await tasklabsRateLimiter.limit(ctx, "ragQuery", { key: userId, throws: true });
    return await retrieveInAction(ctx, { ...args, userId });
  },
});

export const retrieveForActor = internalAction({
  args: {
    workspaceId: workspaceIdArg,
    userId: v.id("users"),
    vector: vectorArg,
    topK: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<RetrieveResult> => await retrieveInAction(ctx, args),
});

/** Local extractive ask with fail-closed per-user rate limiting. */
export const ask = action({
  args: {
    workspaceId: workspaceIdArg,
    question: v.string(),
    vector: vectorArg,
    topK: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Unauthorized");
    await tasklabsRateLimiter.limit(ctx, "ragQuery", { key: userId, throws: true });
    const question = args.question.trim();
    if (question.length < 1 || question.length > 2000) {
      throw new Error("Question must be 1-2000 characters");
    }
    const retrieval = await retrieveInAction(ctx, {
      workspaceId: args.workspaceId,
      userId,
      vector: args.vector,
      topK: args.topK,
      minScore: args.minScore,
    });
    const generated = buildExtractiveAnswer({ question, context: retrieval.results });
    return { ...retrieval, answer: generated.answer, citations: generated.citations };
  },
});

export const askForActor = internalAction({
  args: {
    workspaceId: workspaceIdArg,
    userId: v.id("users"),
    question: v.string(),
    vector: vectorArg,
    topK: v.optional(v.number()),
    minScore: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<ActionAskResult> => {
    const question = args.question.trim();
    if (question.length < 1 || question.length > 2000) throw new Error("Question must be 1-2000 characters");
    const retrieval = await retrieveInAction(ctx, args);
    const generated = buildExtractiveAnswer({ question, context: retrieval.results });
    return { ...retrieval, answer: generated.answer, citations: generated.citations };
  },
});

/** Flag one source for (re)indexing. The Next.js worker claims it. */
export const requestIndex = mutation({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    if (!isRagSourceType(args.sourceType)) throw new Error("Unknown source type");
    if (args.sourceType === "docs") throw new Error("Product docs are not an Ice source");
    await markRagPending(ctx, args.workspaceId, args.sourceType, args.sourceId);
    return { ok: true };
  },
});

/** Worker claim: oldest pending document for this workspace. */
export const claimNext = mutation({
  args: { workspaceId: workspaceIdArg },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    return await claimNextPending(ctx, args.workspaceId);
  },
});

export const writeChunks = mutation({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
    contentVersion: v.string(),
    contentHash: v.string(),
    chunks: v.array(
      v.object({
        ordinal: v.number(),
        text: v.string(),
        textHash: v.string(),
        anchor: v.string(),
        title: v.string(),
        embedding: v.array(v.number()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    if (args.chunks.length > 200) throw new Error("Too many chunks in one write");
    await tasklabsRateLimiter.limit(ctx, "ragIndex", {
      key: `${userId}:${args.workspaceId}`,
      throws: true,
    });
    for (const chunk of args.chunks) {
      if (chunk.embedding.length !== RAG_EMBEDDING_DIMENSIONS) {
        throw new Error(
          `Chunk embeddings must have ${RAG_EMBEDDING_DIMENSIONS} dimensions`,
        );
      }
    }
    await writeChunkVersion(
      ctx,
      args.workspaceId,
      args.sourceType,
      args.sourceId,
      args.contentVersion,
      args.contentHash,
      args.chunks,
    );
    return { ok: true };
  },
});
/** Content-hash skip: identical bytes, existing version stands. */
export const confirmUnchanged = mutation({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
    contentVersion: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    await confirmUnchangedVersion(
      ctx,
      args.workspaceId,
      args.sourceType,
      args.sourceId,
      args.contentVersion,
    );
    return { ok: true };
  },
});

export const markFailed = mutation({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    await markIndexFailed(
      ctx,
      args.workspaceId,
      args.sourceType,
      args.sourceId,
      args.error,
    );
    return { ok: true };
  },
});

export const removeSource = mutation({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    await removeRagSource(ctx, args.workspaceId, args.sourceType, args.sourceId);
    return { ok: true };
  },
});

export const reindex = mutation({
  args: { workspaceId: workspaceIdArg },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    return await reindexWorkspaceForActor(ctx, args.workspaceId, userId);
  },
});

export const feedback = mutation({
  args: {
    workspaceId: workspaceIdArg,
    question: v.string(),
    rating: v.union(v.literal("up"), v.literal("down")),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireMembership(ctx, args.workspaceId);
    return await submitFeedbackForActor(ctx, args.workspaceId, userId, {
      question: args.question,
      rating: args.rating,
      reason: args.reason,
    });
  },
});

/** Canonical text for the index worker. Membership-gated; visibility is
 * enforced at retrieval, not here, so one member's trigger can index
 * another member's private source without ever seeing its content. */
export const sourceText = query({
  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireMembership(ctx, args.workspaceId);
    return await readCanonicalSourceForIndex(
      ctx,
      args.workspaceId,
      args.sourceType,
      args.sourceId,
    );
  },
});

export const pendingDocument = internalQuery({  args: {
    workspaceId: workspaceIdArg,
    sourceType: ragSourceType,
    sourceId: v.string(),
  },
  handler: async (ctx, args) =>
    await getRagDocument(ctx, args.workspaceId, args.sourceType, args.sourceId),
});

/** Hourly safety-net: reset stuck indexing rows, recompute counters. */
export const sweep = internalMutation({
  args: {},
  handler: async (ctx) => await sweepStaleDocuments(ctx, 30 * 60 * 1000),
});
