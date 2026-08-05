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
  input: { email: string; name: string; platformRole?: "ADMIN" | "MEMBER" },
) {
  return await t.run(async (ctx) => await ctx.db.insert("users", input));
}

describe("projects", () => {
  test("creates a project with members, dates, and resources and lists it", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner@example.com",
      name: "Owner",
    });
    const memberId = await seedUser(t, {
      email: "member@example.com",
      name: "Member",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Projects Workspace",
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

    const project = await asOwner.mutation(apiAny.projects.create, {
      workspaceId: workspace.id,
      title: "Website Revamp",
      description: "Redesign the marketing site",
      status: "IN_PROGRESS",
      priority: "HIGH",
      memberIds: [ownerId, memberId],
      startDate: "2026-08-01T00:00:00.000Z",
      endDate: "2026-09-01T00:00:00.000Z",
      resources: [
        { label: "Repo", type: "GITHUB", url: "https://github.com/acme/site" },
        { label: "Signup form", type: "FORM", url: "https://forms.acme.dev/signup" },
      ],
    });

    expect(project).toMatchObject({
      workspaceId: workspace.id,
      creatorId: ownerId,
      title: "Website Revamp",
      description: "Redesign the marketing site",
      status: "IN_PROGRESS",
      priority: "HIGH",
      memberIds: [ownerId, memberId],
      resources: [
        { label: "Repo", type: "GITHUB", url: "https://github.com/acme/site" },
        {
          label: "Signup form",
          type: "FORM",
          url: "https://forms.acme.dev/signup",
        },
      ],
    });
    expect(project.startDate).toBe("2026-08-01T00:00:00.000Z");
    expect(project.endDate).toBe("2026-09-01T00:00:00.000Z");

    const list = await asOwner.query(apiAny.projects.list, {
      workspaceId: workspace.id,
    });
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(project.id);

    const filtered = await asOwner.query(apiAny.projects.list, {
      workspaceId: workspace.id,
      status: "COMPLETED",
    });
    expect(filtered).toEqual([]);
  });

  test("rejects outsiders and non-member project members", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner2@example.com",
      name: "Owner",
    });
    const outsiderId = await seedUser(t, {
      email: "outsider@example.com",
      name: "Outsider",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner2@example.com",
    });
    const asOutsider = t.withIdentity({
      subject: outsiderId,
      email: "outsider@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Isolation Workspace",
      }),
      "workspace",
    );

    await expect(
      asOutsider.mutation(apiAny.projects.create, {
        workspaceId: workspace.id,
        title: "Sneak",
      }),
    ).rejects.toThrow("not a member");

    await expect(
      asOwner.mutation(apiAny.projects.create, {
        workspaceId: workspace.id,
        title: "Bad member",
        memberIds: [outsiderId],
      }),
    ).rejects.toThrow("Project member must be a workspace member");
  });

  test("rejects invalid resource urls", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner3@example.com",
      name: "Owner",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner3@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "URL Workspace",
      }),
      "workspace",
    );

    await expect(
      asOwner.mutation(apiAny.projects.create, {
        workspaceId: workspace.id,
        title: "Bad url",
        resources: [{ label: "Broken", type: "WEBSITE", url: "not-a-url" }],
      }),
    ).rejects.toThrow("Resource url must include a protocol");
  });

  test("deleting a project cascades to its tasks", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner4@example.com",
      name: "Owner",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner4@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Cascade Workspace",
      }),
      "workspace",
    );
    const project = await asOwner.mutation(apiAny.projects.create, {
      workspaceId: workspace.id,
      title: "Cascade project",
    });

    const kept = await asOwner.mutation(apiAny.tasks.create, {
      workspaceId: workspace.id,
      title: "Kept outside project",
    });
    const linked = await asOwner.mutation(apiAny.tasks.create, {
      workspaceId: workspace.id,
      title: "In project",
      projectId: project.id,
    });
    expect(linked.projectId).toBe(project.id);

    await asOwner.mutation(apiAny.projects.remove, {
      workspaceId: workspace.id,
      projectId: project.id,
    });

    const remaining = await asOwner.query(apiAny.tasks.list, {
      workspaceId: workspace.id,
    });
    expect(remaining.map((row: { title: string }) => row.title)).toEqual([
      kept.title,
    ]);

    await expect(
      asOwner.query(apiAny.projects.get, {
        workspaceId: workspace.id,
        projectId: project.id,
      }),
    ).rejects.toThrow("Project not found");
  });

  test("project updates behave like a notice board", async () => {
    const t = testBackend();
    const ownerId = await seedUser(t, {
      email: "owner5@example.com",
      name: "Owner",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner5@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Notice Board Workspace",
      }),
      "workspace",
    );
    const project = await asOwner.mutation(apiAny.projects.create, {
      workspaceId: workspace.id,
      title: "Notice Board",
    });

    const later = await asOwner.mutation(apiAny.projects.addUpdate, {
      workspaceId: workspace.id,
      projectId: project.id,
      body: "Kicked off the design sprint today.",
    });
    const earlier = await asOwner.mutation(apiAny.projects.addUpdate, {
      workspaceId: workspace.id,
      projectId: project.id,
      body: "Planning complete.",
    });
    expect(later.authorId).toBe(ownerId);
    expect(earlier.projectId).toBe(project.id);

    const updates = await asOwner.query(apiAny.projects.updatesList, {
      workspaceId: workspace.id,
      projectId: project.id,
    });
    // Newest first.
    expect(updates.map((row: { body: string }) => row.body)).toEqual([
      "Planning complete.",
      "Kicked off the design sprint today.",
    ]);

    await asOwner.mutation(apiAny.projects.removeUpdate, {
      workspaceId: workspace.id,
      projectId: project.id,
      updateId: earlier.id,
    });
    const afterRemove = await asOwner.query(apiAny.projects.updatesList, {
      workspaceId: workspace.id,
      projectId: project.id,
    });
    expect(afterRemove).toHaveLength(1);
    expect(afterRemove[0].body).toBe("Kicked off the design sprint today.");
  });

  test("MCP dispatch controls projects through projects:* scopes", async () => {
    const t = testBackend();
    const userId = await seedUser(t, {
      email: "mcp-project@example.com",
      name: "MCP Project User",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "mcp-project@example.com",
    });
    const workspace = requireValue(
      await asUser.mutation(apiAny.workspaces.ensurePersonal, {
        name: "MCP Projects Workspace",
      }),
      "workspace",
    );
    const key = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "Projects agent",
      scopes: ["projects:read", "projects:write"],
    });

    const project = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.create",
      input: {
        title: "MCP-driven project",
        status: "PLANNING",
        resources: [
          { label: "Channel", type: "COMMUNICATION", url: "https://chat.acme.dev" },
        ],
      },
    });
    expect(project).toMatchObject({
      workspaceId: workspace.id,
      creatorId: userId,
      title: "MCP-driven project",
      status: "PLANNING",
      resources: [
        { label: "Channel", type: "COMMUNICATION", url: "https://chat.acme.dev" },
      ],
    });

    const list = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.list",
      input: {},
    });
    expect(list.map((row: { title: string }) => row.title)).toEqual([
      "MCP-driven project",
    ]);

    const update = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.updates.create",
      input: { projectId: project.id, body: "MCP posted this update." },
    });
    expect(update.body).toBe("MCP posted this update.");

    const noteList = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.updates.list",
      input: { projectId: project.id },
    });
    expect(noteList.map((row: { body: string }) => row.body)).toEqual([
      "MCP posted this update.",
    ]);

    await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.delete",
      input: { projectId: project.id },
    });

    const afterDelete = await t.action(apiAny.apiKeys.mcpDispatch, {
      token: key.token,
      toolName: "projects.list",
      input: {},
    });
    expect(afterDelete).toEqual([]);

    const readOnly = await asUser.mutation(apiAny.apiKeys.create, {
      workspaceId: workspace.id,
      name: "Projects read only",
      scopes: ["projects:read"],
    });
    await expect(
      t.action(apiAny.apiKeys.mcpDispatch, {
        token: readOnly.token,
        toolName: "projects.create",
        input: { title: "Blocked" },
      }),
    ).rejects.toThrow("Insufficient API key scope");
  });
});