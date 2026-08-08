import { convexTest } from "convex-test";
import rateLimiterTest from "@convex-dev/rate-limiter/test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);
const apiAny = api as any;

function testBackend() {
  const t = convexTest(schema, modules);
  rateLimiterTest.register(t);
  return t;
}

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value == null) throw new Error(`Expected ${label}`);
  return value;
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  input: {
    email: string;
    name: string;
    platformRole?: "ADMIN" | "MEMBER";
  },
) {
  return await t.run(async (ctx) => await ctx.db.insert("users", input));
}

describe("api keys", () => {
  test("creates hash-only workspace-scoped keys and verifies bearer actors", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "api@example.com",
      name: "API User",
    });
    const asUser = t.withIdentity({ subject: userId, email: "api@example.com" });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "API Workspace",
      }),
      "workspace",
    );

    const created = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "Local agent",
      scopes: ["tasks:read", "tasks:write", "search:read"],
    });

    expect(created.token).toMatch(
      /^tlk_live_[A-Za-z0-9_-]{12}_[A-Za-z0-9_-]{43}$/,
    );
    expect(created.prefix).toHaveLength(12);
    expect(created.scopes).toEqual(["tasks:read", "tasks:write", "search:read"]);

    const rows = await t.run(async (ctx) => await ctx.db.query("apiKeys").collect());
    expect(rows).toHaveLength(1);
    expect(rows[0].secretHash).not.toBe(created.token);
    expect(rows[0].secretHash).toMatch(/^[A-Za-z0-9_-]{43}$/);

    const list = await asUser.query(apiAny.apiKeys.list, {
      workspaceId: workspace.id,
    });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: "Local agent",
      prefix: created.prefix,
      revokedAt: null,
    });
    expect("token" in list[0]).toBe(false);
    expect("secretHash" in list[0]).toBe(false);

    const actor = await t.mutation(apiAny.apiKeys.verifyBearer, {
      token: created.token,
      requiredScopes: ["tasks:read"],
    });
    expect(actor).toMatchObject({
      authType: "apiKey",
      userId,
      workspaceId: workspace.id,
      apiKeyId: created.id,
      workspaceRole: "OWNER",
      platformRole: "MEMBER",
    });

    await expect(
      t.mutation(apiAny.apiKeys.verifyBearer, {
        token: created.token,
        requiredScopes: ["members:admin"],
      }),
    ).rejects.toThrow("Insufficient API key scope");
  });

  test("rotates keys without exposing old secrets and deletes revoked keys", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "rotate@example.com",
      name: "Rotate User",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "rotate@example.com",
    });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Rotate Workspace",
      }),
      "workspace",
    );
    const created = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "Rotating key",
      scopes: ["tasks:read"],
    });
    const rotated = await asUser.mutation(apiAny.apiKeys.rotate, {
      keyId: created.id,
    });

    expect(rotated.id).toBe(created.id);
    expect(rotated.token).not.toBe(created.token);
    expect(rotated.prefix).not.toBe(created.prefix);
    await expect(
      t.mutation(apiAny.apiKeys.verifyBearer, {
        token: created.token,
        requiredScopes: ["tasks:read"],
      }),
    ).rejects.toThrow("Invalid API key");

    await asUser.mutation(apiAny.apiKeys.revoke, { keyId: created.id });
    expect(
      await asUser.query(apiAny.apiKeys.list, { workspaceId: workspace.id }),
    ).toEqual([]);
    expect(await t.run(async (ctx) => await ctx.db.get(created.id))).toBeNull();
    await expect(
      t.mutation(apiAny.apiKeys.verifyBearer, {
        token: rotated.token,
        requiredScopes: ["tasks:read"],
      }),
    ).rejects.toThrow("Invalid API key");
  });

  test("limits admin scopes to privileged actors and keeps management session-only", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner@example.com",
      name: "Owner",
      platformRole: "MEMBER",
    });
    const memberId = await seedUser(t, {
      email: "member@example.com",
      name: "Member",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner@example.com",
    });
    const asMember = t.withIdentity({
      subject: memberId,
      email: "member@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Scoped Workspace",
      }),
      "workspace",
    );
    await t.run(async (ctx) => {
      await ctx.db.insert("workspaceMembers", {
        workspaceId: workspace.id,
        userId: memberId,
        role: "MEMBER",
        joinedAt: Date.now(),
      });
    });

    await expect(
      asMember.mutation(apiAny.apiKeys.create, {
        workspaceId: workspace.id,
        name: "Admin attempt",
        scopes: ["members:admin"],
      }),
    ).rejects.toThrow("Workspace admin scopes require ADMIN or OWNER role");

    await expect(
      t.mutation(apiAny.apiKeys.create, {
        workspaceId: workspace.id,
        name: "No session",
        scopes: ["tasks:read"],
      }),
    ).rejects.toThrow("Unauthorized");
  });

  test("dispatches MCP tool calls through API key scope and workspace actors", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "mcp@example.com",
      name: "MCP User",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "mcp@example.com",
    });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "MCP Workspace",
      }),
      "workspace",
    );

    const created = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "MCP",
      scopes: ["tasks:read", "tasks:write"],
    });
    const task = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.create",
      input: { idempotencyKey: "create-task-1", title: "Created by MCP" },
    });
    expect(task).toMatchObject({
      workspaceId: workspace.id,
      creatorId: userId,
      title: "Created by MCP",
    });

    const list = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.list",
      input: {},
    });
    expect(list.map((row: { title: string }) => row.title)).toEqual([
      "Created by MCP",
    ]);

    const readOnly = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "Read only",
      scopes: ["tasks:read"],
    });
    await expect(
      t.action(apiAny.apiKeys.mcpDispatch, {
        token: readOnly.token,
        toolName: "tasks.create",
        input: { idempotencyKey: "blocked-task", title: "Blocked" },
      }),
    ).rejects.toThrow("Insufficient API key scope");
  });

  test("mcpDispatch batch-deletes tasks atomically with tasks.deleteMany", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "mcp-batch@example.com",
      name: "MCP Batch",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "mcp-batch@example.com",
    });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "MCP Batch Workspace",
      }),
      "workspace",
    );
    const created = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "MCP Batch",
      scopes: ["tasks:read", "tasks:write"],
    });

    const first = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.create",
      input: { idempotencyKey: "batch-first", title: "First" },
    });
    const second = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.create",
      input: { idempotencyKey: "batch-second", title: "Second" },
    });

    const result = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.deleteMany",
      input: { taskIds: [first.id, second.id] },
    });
    expect(result).toEqual({ deleted: 2 });

    const list = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: created.token,
      toolName: "tasks.list",
      input: {},
    });
    expect(list).toEqual([]);
  });

  test("makes MCP task creation idempotent and preserves opaque IDs across tools", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "mcp-idempotency@example.com",
      name: "MCP Idempotency",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "mcp-idempotency@example.com",
    });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "MCP Idempotency Workspace",
      }),
      "workspace",
    );
    const key = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "MCP Idempotency",
      scopes: ["tasks:read", "tasks:write"],
    });
    const input = {
      idempotencyKey: "opaque-round-trip",
      title: "Create exactly once",
      status: "TODO",
    };

    const created = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.create",
      input,
    });
    const replayed = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.create",
      input,
    });
    expect(replayed.id).toBe(created.id);

    await expect(
      t.action(apiAny.apiKeys.mcpDispatch, {
        token: key.token,
        toolName: "tasks.create",
        input: { ...input, title: "Different input" },
      }),
    ).rejects.toThrow("idempotencyKey was already used with different task input");

    const listed = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.list",
      input: {},
    });
    expect(listed).toHaveLength(1);
    expect(listed[0].id).toBe(created.id);

    const fetched = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.get",
      input: { taskId: created.id },
    });
    expect(fetched.id).toBe(created.id);
    const updated = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.update",
      input: { taskId: created.id, title: "Updated through the same ID" },
    });
    expect(updated.id).toBe(created.id);
    await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "tasks.delete",
      input: { taskId: created.id },
    });
    expect(
      await t.action(apiAny.apiKeys.mcpDispatch, {
        token: key.token,
        toolName: "tasks.list",
        input: {},
      }),
    ).toEqual([]);
  });

  test("returns deterministic task status errors and structured rate limits", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "mcp-rate@example.com",
      name: "MCP Rate",
    });
    const asUser = t.withIdentity({ subject: userId, email: "mcp-rate@example.com" });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "MCP Rate Workspace",
      }),
      "workspace",
    );
    const key = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "MCP Rate",
      scopes: ["tasks:read", "tasks:write"],
    });

    await expect(
      t.action(apiAny.apiKeys.mcpDispatch, {
        token: key.token,
        toolName: "tasks.create",
        input: {
          idempotencyKey: "invalid-status",
          title: "Blocked",
          status: "BLOCKED",
        },
      }),
    ).rejects.toThrow(
      "status must be one of BACKLOG, TODO, IN_PROGRESS, IN_REVIEW, DONE, CANCELLED, ARCHIVED; represent blocked work as BACKLOG plus a blocked label",
    );

    let rateLimitError: unknown;
    for (let call = 0; call < 50 && rateLimitError === undefined; call += 1) {
      try {
        await t.action(apiAny.apiKeys.mcpDispatch, {
          token: key.token,
          toolName: "tasks.list",
          input: {},
        });
      } catch (error) {
        rateLimitError = error;
      }
    }
    expect(rateLimitError).toMatchObject({
      data: {
        kind: "RateLimited",
        name: "apiKeyVerify",
        retryAfter: expect.any(Number),
      },
    });
    expect(
      (rateLimitError as { data: { retryAfter: number } }).data.retryAfter,
    ).toBeGreaterThan(0);
  });
});
