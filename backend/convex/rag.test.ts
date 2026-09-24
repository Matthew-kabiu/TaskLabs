import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { chunkRagText, ragContentHash, ragDocumentKey, stableChunkId } from "./rag/chunk";
import { rankCandidates } from "./rag/service";
import { buildExtractiveAnswer, snippetFor } from "./rag/answer";
import { RAG_EMBEDDING_DIMENSIONS } from "./rag/providers";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);

function testBackend() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

function spikeVector(index: number): number[] {
  const vector = new Array<number>(RAG_EMBEDDING_DIMENSIONS).fill(0);
  vector[index] = 1;
  return vector;
}

async function seedWorkspace(
  t: ReturnType<typeof convexTest>,
  name: string,
  ownerEmail: string,
) {
  const userId: Id<"users"> = await t.run(async (ctx) => {
    return await ctx.db.insert("users", { email: ownerEmail, name: "Owner" });
  });
  const workspaceId: Id<"workspaces"> = await t.run(async (ctx) => {
    return await ctx.db.insert("workspaces", {
      name,
      slug: name.toLowerCase(),
      isPersonal: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("workspaceMembers", {
      workspaceId,
      userId,
      role: "OWNER",
      joinedAt: Date.now(),
    });
  });
  return { userId, workspaceId };
}

function identity(t: ReturnType<typeof convexTest>, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function seedChunk(
  t: ReturnType<typeof convexTest>,
  input: {
    workspaceId: Id<"workspaces">;
    sourceType: "task" | "taskComment" | "project" | "projectUpdate" | "event" | "docs";
    sourceId: string;
    anchor: string;
    title?: string;
    text: string;
    vector: number[];
  },
) {
  await t.run(async (ctx) => {
    const documentId = await ctx.db.insert("ragDocuments", {
      workspaceId: input.workspaceId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      contentVersion: "v1",
      contentHash: ragContentHash(input.text),
      indexStatus: "complete",
      embeddingModel: "test-model",
      embeddingVersion: "test-1",
      chunkCount: 1,
      updatedAt: Date.now(),
    });
    await ctx.db.insert("ragChunks", {
      workspaceId: input.workspaceId,
      documentId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      sourceAnchor: input.anchor,
      title: input.title ?? "Test source",
      ordinal: 0,
      text: input.text,
      textHash: ragContentHash(input.text),
      embedding: input.vector,
      embeddingModel: "test-model",
      embeddingVersion: "test-1",
      version: 1,
      isActive: true,
      createdAt: Date.now(),
    });
  });
}

describe("rag chunking", () => {
  test("empty input yields no chunks", () => {
    expect(chunkRagText("   \n  ")).toEqual([]);
  });

  test("chunking is deterministic with stable ids", () => {
    const body = ["Alpha paragraph one.", "Beta paragraph two.", "Gamma paragraph three."].join(
      "\n\n",
    );
    const first = chunkRagText(body, 40, 10);
    const second = chunkRagText(body, 40, 10);
    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(1);
    const key = ragDocumentKey("w", "task", "t1", "v1", "e1");
    expect(stableChunkId(key, 0)).toBe(`${key}:0`);
    for (const chunk of first) {
      expect(chunk.text.length).toBeGreaterThan(0);
      expect(chunk.textHash).toBe(ragContentHash(chunk.text));
    }
  });

  test("content hash is stable", () => {
    expect(ragContentHash("ice")).toBe(ragContentHash("ice"));
    expect(ragContentHash("ice")).not.toBe(ragContentHash("snow"));
  });
});

describe("rag extractive answer", () => {
  test("empty context yields an explicit not-found answer", () => {
    const result = buildExtractiveAnswer({ question: "Anything?", context: [] });
    expect(result.citations).toEqual([]);
    expect(result.answer).toMatch(/nothing/i);
  });

  test("cites distinct sources with stable anchors", () => {
    const result = buildExtractiveAnswer({
      question: "What is blocked?",
      context: [
        {
          text: "Deploy is blocked on DNS.",
          score: 0.9,
          sourceType: "task",
          sourceId: "t1",
          anchor: "task#3",
          title: "Deploy",
          target: { page: "task", id: "t1" },
        },
        {
          text: "Deploy is blocked on DNS.",
          score: 0.8,
          sourceType: "task",
          sourceId: "t1",
          anchor: "task#3",
          title: "Deploy",
          target: { page: "task", id: "t1" },
        },
      ],
    });
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].anchor).toBe("task#3");
    expect(result.answer).toContain("task#3");
  });

  test("snippets are bounded", () => {
    expect(snippetFor("a".repeat(1000)).length).toBeLessThanOrEqual(281);
  });
});

describe("rag retrieval isolation", () => {
  // rankCandidates is the exact ranking path retrieveWithVector uses after
  // the live HNSW call (convex-test has no vectorSearch). Candidates are
  // real rows; only the similarity scores are synthetic.
  async function rank(
    t: ReturnType<typeof convexTest>,
    workspaceId: Id<"workspaces">,
    userId: Id<"users">,
    score: number,
  ) {
    const rows = await t.run(async (ctx) => {
      return await ctx.db.query("ragChunks").collect();
    });
    return await t.run(async (ctx) =>
      rankCandidates(
        ctx as never,
        workspaceId,
        userId,
        rows.map((row) => ({ id: row._id, score })),
        { topK: 5, minScore: 0.2, allowedTypes: null },
      ),
    );
  }

  test("one workspace cannot retrieve another workspace chunks", async () => {
    const t = testBackend();
    const first = await seedWorkspace(t, "First", "first@example.com");
    const second = await seedWorkspace(t, "Second", "second@example.com");
    await seedChunk(t, {
      workspaceId: second.workspaceId,
      sourceType: "docs",
      sourceId: "docs:readme",
      anchor: "docs:readme#top",
      text: "Secret second workspace plan",
      vector: spikeVector(0),
    });

    const results = await rank(t, first.workspaceId, first.userId, 0.9);
    expect(results).toEqual([]);
  });

  test("private tasks are hidden from other members", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "Team", "owner@example.com");
    const otherId: Id<"users"> = await t.run(async (ctx) => {
      const id = await ctx.db.insert("users", {
        email: "other@example.com",
        name: "Other",
      });
      await ctx.db.insert("workspaceMembers", {
        workspaceId,
        userId: id,
        role: "MEMBER",
        joinedAt: Date.now(),
      });
      return id;
    });
    const taskId: Id<"tasks"> = await t.run(async (ctx) => {
      return await ctx.db.insert("tasks", {
        workspaceId,
        creatorId: userId,
        number: 1,
        title: "Private plan",
        status: "TODO",
        priority: "HIGH",
        position: 0,
        isPrivate: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    await seedChunk(t, {
      workspaceId,
      sourceType: "task",
      sourceId: taskId,
      anchor: "task#1",
      text: "Private plan contents",
      vector: spikeVector(0),
    });

    expect(await rank(t, workspaceId, otherId, 0.9)).toEqual([]);
    const ownerView = await rank(t, workspaceId, userId, 0.9);
    expect(ownerView).toHaveLength(1);
    expect(ownerView[0].anchor).toBe("task#1");
  });

  test("distant vectors fall below the relevance threshold", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "Solo", "solo@example.com");
    await seedChunk(t, {
      workspaceId,
      sourceType: "docs",
      sourceId: "docs:guide",
      anchor: "docs:guide#top",
      text: "Onboarding guide",
      vector: spikeVector(0),
    });
    expect(await rank(t, workspaceId, userId, 0.05)).toEqual([]);
  });

  test("creating a task flags it for indexing", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "Flag", "flag@example.com");
    const created = (await identity(t, userId).mutation(api.tasks.create, {
      workspaceId,
      title: "Index me",
    })) as { id: string };
    const status = await identity(t, userId).query(api.rag.status, { workspaceId });
    expect(status.pendingCount).toBe(1);

    const claimed = await identity(t, userId).mutation(api.rag.claimNext, {
      workspaceId,
    });
    expect(claimed?.sourceType).toBe("task");
    expect(claimed?.sourceId).toBe(created.id);
  });

  test("worker write then task delete removes index rows synchronously", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "Gone", "gone@example.com");
    const created = (await identity(t, userId).mutation(api.tasks.create, {
      workspaceId,
      title: "Temporary",
    })) as { id: string };
    await identity(t, userId).mutation(api.rag.claimNext, { workspaceId });
    await identity(t, userId).mutation(api.rag.writeChunks, {
      workspaceId,
      sourceType: "task",
      sourceId: created.id,
      contentVersion: "v1",
      contentHash: "abc123",
      chunks: [
        {
          ordinal: 0,
          text: "Temporary contents",
          textHash: ragContentHash("Temporary contents"),
          anchor: "task#1",
          title: "Temporary",
          embedding: spikeVector(0),
        },
      ],
    });
    const before = await rank(t, workspaceId, userId, 0.9);
    expect(before).toHaveLength(1);

    await identity(t, userId).mutation(api.tasks.remove, {
      workspaceId,
      taskId: created.id as Id<"tasks">,
    });
    const remaining = await t.run(async (ctx) => {
      return await ctx.db
        .query("ragChunks")
        .withIndex("by_workspace_source", (q) =>
          q.eq("workspaceId", workspaceId).eq("sourceId", created.id),
        )
        .collect();
    });
    expect(remaining).toEqual([]);
    const status = await identity(t, userId).query(api.rag.status, { workspaceId });
    expect(status.pendingCount).toBe(0);
  });
});
