import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";
import { keywordQuery } from "./iceIndex";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);

function testBackend() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

async function seedWorkspace(t: ReturnType<typeof convexTest>, email: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: "Owner" });
    const otherId = await ctx.db.insert("users", { email: `other-${email}`, name: "Other" });
    const workspaceId = await ctx.db.insert("workspaces", { name: "Ice", slug: `ice-${email}`, isPersonal: false, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("workspaceMembers", { workspaceId, userId, role: "OWNER", joinedAt: Date.now() });
    await ctx.db.insert("workspaceMembers", { workspaceId, userId: otherId, role: "MEMBER", joinedAt: Date.now() });
    return { userId, otherId, workspaceId };
  });
}

async function seedTasks(t: ReturnType<typeof convexTest>, workspaceId: Id<"workspaces">, creatorId: Id<"users">, count: number, extra: { projectId?: Id<"projects">; isPrivate?: boolean; title?: string } = {}) {
  return await t.run(async (ctx) => {
    const ids: Id<"tasks">[] = [];
    for (let i = 0; i < count; i++) {
      ids.push(await ctx.db.insert("tasks", {
        workspaceId, creatorId, number: i + 1, title: extra.title ?? `Task ${i + 1}`, status: "TODO", priority: "MEDIUM", position: i,
        isPrivate: extra.isPrivate ?? false, projectId: extra.projectId, createdAt: Date.now(), updatedAt: Date.now(),
      }));
    }
    return ids;
  });
}

async function syncAll(actor: ReturnType<ReturnType<typeof convexTest>["withIdentity"]>, workspaceId: Id<"workspaces">) {
  for (const sourceType of ["task", "taskComment", "project", "projectUpdate", "event"] as const) {
    await actor.mutation(api.iceIndex.syncSources, { workspaceId, sourceType, paginationOpts: { numItems: 100, cursor: null } });
  }
  await actor.mutation(api.iceIndex.finishSourceSync, { workspaceId });
}

describe("ice index queue", () => {
  test("claims in batches across rows that share a timestamp and counts completions", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "batch@example.com");
    await seedTasks(t, workspaceId, userId, 20);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const { namespace } = await actor.query(api.iceIndex.config, { workspaceId });

    const first = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace, max: 16 });
    expect(first).toHaveLength(16);
    // In-flight claims are skipped, not re-claimed; the remaining rows still come through.
    const second = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace, max: 16 });
    expect(second).toHaveLength(4);
    expect(new Set([...first, ...second].map((c) => c.sourceId)).size).toBe(20);

    for (const claimed of [...first, ...second]) {
      await actor.mutation(api.iceIndex.write, { workspaceId, namespace, documentId: claimed.documentId, claim: claimed.claim, chunks: [{ text: claimed.text, title: claimed.title, anchor: claimed.anchor, embedding: [1, 0, 0] }] });
    }
    expect(await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace })).toHaveLength(0);
    const status = await actor.query(api.iceIndex.status, { workspaceId });
    expect(status).toMatchObject({ completeCount: 20, chunkCount: 20, pendingCount: 0, failedCount: 0 });
  });

  test("an edited source is claimed again after the watermark passed it", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "edit@example.com");
    const [taskId] = await seedTasks(t, workspaceId, userId, 1);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const { namespace } = await actor.query(api.iceIndex.config, { workspaceId });
    const [claimed] = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace });
    await actor.mutation(api.iceIndex.write, { workspaceId, namespace, documentId: claimed.documentId, claim: claimed.claim, chunks: [{ text: "x", title: "x", anchor: "task#1", embedding: [1] }] });

    await actor.mutation(api.tasks.update, { workspaceId, taskId, title: "Renamed task" });
    const status = await actor.query(api.iceIndex.status, { workspaceId });
    expect(status.pendingCount).toBe(1);
    const again = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace });
    expect(again.map((c) => c.sourceId)).toEqual([taskId]);
    expect(again[0].text).toContain("Renamed task");
  });

  test("failed sources wait for an explicit retry", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "fail@example.com");
    await seedTasks(t, workspaceId, userId, 1);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const { namespace } = await actor.query(api.iceIndex.config, { workspaceId });
    const [claimed] = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace });
    await actor.mutation(api.iceIndex.failed, { workspaceId, documentId: claimed.documentId, claim: claimed.claim, error: "provider down" });

    expect(await actor.query(api.iceIndex.status, { workspaceId })).toMatchObject({ failedCount: 1, pendingCount: 0, recentErrors: [{ error: "provider down" }] });
    expect(await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace })).toHaveLength(0);

    const begun = await actor.mutation(api.iceIndex.beginIndex, { workspaceId, retryFailed: true });
    expect(begun.requeued).toBe(1);
    expect(await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace })).toHaveLength(1);
    expect((await actor.query(api.iceIndex.status, { workspaceId })).failedCount).toBe(0);
  });

  test("run errors are recorded and cleared by a clean run", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "run@example.com");
    const actor = t.withIdentity({ subject: userId });
    await actor.mutation(api.iceIndex.recordRun, { workspaceId, error: "Rate limit exceeded" });
    expect((await actor.query(api.iceIndex.status, { workspaceId })).lastRunError).toBe("Rate limit exceeded");
    await actor.mutation(api.iceIndex.recordRun, { workspaceId });
    expect((await actor.query(api.iceIndex.status, { workspaceId })).lastRunError).toBeNull();
  });

  test("reindex keeps earlier namespaces searchable and purges beyond three", async () => {
    vi.useFakeTimers();
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "reindex@example.com");
    await seedTasks(t, workspaceId, userId, 1);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const original = (await actor.query(api.iceIndex.config, { workspaceId })).namespace;
    const [claimed] = await actor.mutation(api.iceIndex.claimBatch, { workspaceId, namespace: original });
    await actor.mutation(api.iceIndex.write, { workspaceId, namespace: original, documentId: claimed.documentId, claim: claimed.claim, chunks: [{ text: "x", title: "x", anchor: "task#1", embedding: [1] }] });

    await actor.mutation(api.iceIndex.reindex, { workspaceId });
    const after = await actor.query(api.iceIndex.config, { workspaceId });
    expect(after.namespace).not.toBe(original);
    expect(after.retained.map((entry) => entry.namespace)).toEqual([original]);
    expect(await t.run(async (ctx) => (await ctx.db.query("iceChunks").withIndex("by_namespace", (q) => q.eq("namespace", original)).collect()).length)).toBe(1);

    for (let i = 0; i < 3; i++) await actor.mutation(api.iceIndex.reindex, { workspaceId });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const final = await actor.query(api.iceIndex.config, { workspaceId });
    expect(final.retained).toHaveLength(3);
    expect(final.retained.map((entry) => entry.namespace)).not.toContain(original);
    const leftovers = await t.run(async (ctx) => ({
      chunks: (await ctx.db.query("iceChunks").withIndex("by_namespace", (q) => q.eq("namespace", original)).collect()).length,
      docs: (await ctx.db.query("iceDocuments").withIndex("by_namespace_source", (q) => q.eq("namespace", original)).collect()).length,
    }));
    expect(leftovers).toEqual({ chunks: 0, docs: 0 });
    vi.useRealTimers();
  });
});

describe("ice retrieval ranking", () => {
  test("keyword hits expand one hop without exposing private tasks", async () => {
    const t = testBackend();
    const { userId, otherId, workspaceId } = await seedWorkspace(t, "graph@example.com");
    const projectId = await t.run(async (ctx) => ctx.db.insert("projects", {
      workspaceId, creatorId: userId, title: "Apollo launch", status: "IN_PROGRESS", priority: "HIGH", memberIds: [], resources: [], createdAt: Date.now(), updatedAt: Date.now(),
    }));
    const [publicTask] = await seedTasks(t, workspaceId, userId, 1, { projectId, title: "Public checklist" });
    const [privateTask] = await seedTasks(t, workspaceId, otherId, 1, { projectId, title: "Secret checklist", isPrivate: true });
    await t.run(async (ctx) => ctx.db.insert("projectUpdates", { workspaceId, projectId, authorId: userId, body: "Launch moved to Friday", createdAt: Date.now() }));

    const results = await t.query(internal.iceIndex.resolve, { workspaceId, userId, text: "How is the Apollo project going?", candidates: [], topK: 5 });
    const ids = results.map((r) => r.sourceId);
    expect(results[0]).toMatchObject({ sourceType: "project", sourceId: projectId });
    expect(ids).toContain(publicTask);
    expect(ids).not.toContain(privateTask);
    const update = results.find((r) => r.sourceType === "projectUpdate");
    expect(update?.via).toBe(results[0].anchor);
  });

  test("keyword query drops filler words", () => {
    expect(keywordQuery("What is the status of the Apollo launch?")).toBe("status apollo launch");
    expect(keywordQuery("the and of")).toBe("");
  });
});

describe("ice system prompt", () => {
  test("saves, trims, and clears the per-user prompt", async () => {
    const t = testBackend();
    const { userId, otherId, workspaceId } = await seedWorkspace(t, "prompt@example.com");
    const actor = t.withIdentity({ subject: userId });
    await actor.mutation(api.icePreferences.saveSystemPrompt, { workspaceId, prompt: "  Use bullet points  " });
    expect((await actor.query(api.icePreferences.get, { workspaceId }))?.systemPrompt).toBe("Use bullet points");
    expect(await t.withIdentity({ subject: otherId }).query(api.icePreferences.get, { workspaceId })).toBeNull();
    await actor.mutation(api.icePreferences.saveSystemPrompt, { workspaceId, prompt: "" });
    expect((await actor.query(api.icePreferences.get, { workspaceId }))?.systemPrompt).toBe("");
    await expect(actor.mutation(api.icePreferences.saveSystemPrompt, { workspaceId, prompt: "x".repeat(4001) })).rejects.toThrow();
  });
});

describe("ice over MCP and maintenance", () => {
  test("MCP status and reindex act on the key owner's personal index", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "mcp@example.com");
    await seedTasks(t, workspaceId, userId, 2);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const before = (await actor.query(api.iceIndex.config, { workspaceId })).namespace;
    const created = await actor.mutation(api.apiKeys.create, { workspaceId, name: "Ice", scopes: ["rag:read", "rag:write"] });

    const status = await t.action(api.apiKeys.mcpDispatch, { token: created.token, toolName: "rag.status", input: {} });
    expect(status).toMatchObject({ namespace: before, pendingCount: 2, completeCount: 0 });

    await t.action(api.apiKeys.mcpDispatch, { token: created.token, toolName: "rag.reindex", input: {} });
    const after = await actor.query(api.iceIndex.config, { workspaceId });
    expect(after.namespace).not.toBe(before);
    expect(after.retained.map((entry) => entry.namespace)).toEqual([before]);

    // Local embeddings need the vector the MCP route computes; without it the call fails clearly.
    await expect(t.action(api.apiKeys.mcpDispatch, { token: created.token, toolName: "rag.query", input: { q: "status" } })).rejects.toThrow(/queryVector/);
  });

  test("sweep keeps source revisions and removes leftover docs sources", async () => {
    const t = testBackend();
    const { userId, workspaceId } = await seedWorkspace(t, "sweep@example.com");
    await seedTasks(t, workspaceId, userId, 1);
    const actor = t.withIdentity({ subject: userId });
    await syncAll(actor, workspaceId);
    const { namespace } = await actor.query(api.iceIndex.config, { workspaceId });
    await t.run(async (ctx) => {
      await ctx.db.insert("ragDocuments", { workspaceId, sourceType: "docs", sourceId: "docs:DESIGN.md", contentVersion: "", contentHash: "", indexStatus: "indexing", embeddingModel: "m", embeddingVersion: "v", chunkCount: 0, updatedAt: 1 });
      const documentId = await ctx.db.insert("iceDocuments", { workspaceId, userId, namespace, sourceType: "docs", sourceId: "docs:DESIGN.md", sourceRevision: 1, state: "complete", claim: "c", chunkCount: 1, updatedAt: 1 });
      await ctx.db.insert("iceChunks", { workspaceId, userId, namespace, documentId, text: "d", title: "d", anchor: "docs:DESIGN.md#x", embedding: [1] });
    });
    const revisions = async () => await t.run(async (ctx) => (await ctx.db.query("ragDocuments").withIndex("by_workspace_updated", (q) => q.eq("workspaceId", workspaceId)).collect()).filter((row) => row.sourceType === "task").map((row) => row.updatedAt));
    const before = await revisions();

    await t.mutation(internal.rag.sweep, {});
    expect(await revisions()).toEqual(before);
    const leftovers = await t.run(async (ctx) => ({
      ledger: (await ctx.db.query("ragDocuments").withIndex("by_workspace_source", (q) => q.eq("workspaceId", workspaceId).eq("sourceType", "docs")).collect()).length,
      docs: (await ctx.db.query("iceDocuments").withIndex("by_workspace_source", (q) => q.eq("workspaceId", workspaceId).eq("sourceType", "docs")).collect()).length,
      chunks: (await ctx.db.query("iceChunks").withIndex("by_namespace", (q) => q.eq("namespace", namespace)).collect()).length,
    }));
    expect(leftovers).toEqual({ ledger: 0, docs: 0, chunks: 0 });
  });
});
