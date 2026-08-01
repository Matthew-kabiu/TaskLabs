import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);

type TaskDto = { id: string };

function requireValue<T>(value: T | null | undefined, label: string): T {
  if (value == null) {
    throw new Error(`Expected ${label}`);
  }
  return value;
}

async function seedUser(
  t: ReturnType<typeof convexTest>,
  input: { email: string; name: string },
) {
  return await t.run(async (ctx) => {
    return await ctx.db.insert("users", input);
  });
}

async function addWorkspaceMember(
  t: ReturnType<typeof convexTest>,
  input: { workspaceId: Id<"workspaces">; userId: Id<"users"> },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("workspaceMembers", {
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: "MEMBER",
      joinedAt: Date.now(),
    });
  });
}

describe("workspaces and tasks MVP", () => {
  test("ensurePersonal creates one owner personal workspace per user", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      email: "matt@example.com",
      name: "Matt",
    });
    const asMatt = t.withIdentity({ subject: userId, email: "matt@example.com" });

    const first = requireValue(
      await asMatt.mutation(api.workspaces.ensurePersonal, {
        name: "Matt Home",
      }),
      "first personal workspace",
    );
    const second = requireValue(
      await asMatt.mutation(api.workspaces.ensurePersonal, {
        name: "Ignored",
      }),
      "second personal workspace",
    );
    const workspaces = await asMatt.query(api.workspaces.list, {});

    expect(first).toMatchObject({
      name: "Matt Home",
      isPersonal: true,
      role: "OWNER",
    });
    expect(second.id).toBe(first.id);
    expect(workspaces).toHaveLength(1);
  });

  test("private tasks are only visible to their creator inside a shared workspace", async () => {
    const t = convexTest(schema, modules);
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
    const asMember = t.withIdentity({
      subject: memberId,
      email: "member@example.com",
    });

    const workspace = requireValue(
      await asOwner.mutation(api.workspaces.ensurePersonal, {
        name: "Team",
      }),
      "team workspace",
    );
    await addWorkspaceMember(t, {
      workspaceId: workspace.id,
      userId: memberId,
    });

    const publicTask = await asOwner.mutation(api.tasks.create, {
      workspaceId: workspace.id,
      title: "Public task",
      isPrivate: false,
    });
    const privateTask = await asOwner.mutation(api.tasks.create, {
      workspaceId: workspace.id,
      title: "Private task",
      isPrivate: true,
    });

    const ownerTasks = (await asOwner.query(api.tasks.list, {
      workspaceId: workspace.id,
    })) as TaskDto[];
    const memberTasks = (await asMember.query(api.tasks.list, {
      workspaceId: workspace.id,
    })) as TaskDto[];

    expect(ownerTasks.map((task) => task.id)).toEqual([
      publicTask.id,
      privateTask.id,
    ]);
    expect(memberTasks.map((task) => task.id)).toEqual([publicTask.id]);
    await expect(
      asMember.query(api.tasks.get, {
        workspaceId: workspace.id,
        taskId: privateTask.id,
      }),
    ).rejects.toThrow("Task not found");
    await expect(
      asMember.mutation(api.tasks.update, {
        workspaceId: workspace.id,
        taskId: privateTask.id,
        title: "Leaked",
      }),
    ).rejects.toThrow("Forbidden: private task");
  });

  test("workspace membership is required for task access", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: "owner@example.com",
      name: "Owner",
    });
    const outsiderId = await seedUser(t, {
      email: "outsider@example.com",
      name: "Outsider",
    });
    const asOwner = t.withIdentity({
      subject: ownerId,
      email: "owner@example.com",
    });
    const asOutsider = t.withIdentity({
      subject: outsiderId,
      email: "outsider@example.com",
    });

    const workspace = requireValue(
      await asOwner.mutation(api.workspaces.ensurePersonal, {
        name: "Owner Home",
      }),
      "owner workspace",
    );
    await asOwner.mutation(api.tasks.create, {
      workspaceId: workspace.id,
      title: "Scoped task",
    });

    await expect(
      asOutsider.query(api.tasks.list, { workspaceId: workspace.id }),
    ).rejects.toThrow("Forbidden: not a member of this workspace");
  });

  test("batch deletion is atomic and enforces private task ownership", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedUser(t, {
      email: "owner@example.com",
      name: "Owner",
    });
    const memberId = await seedUser(t, {
      email: "member@example.com",
      name: "Member",
    });
    const asOwner = t.withIdentity({ subject: ownerId, email: "owner@example.com" });
    const asMember = t.withIdentity({ subject: memberId, email: "member@example.com" });
    const workspace = requireValue(
      await asOwner.mutation(api.workspaces.ensurePersonal, { name: "Team" }),
      "workspace",
    );
    await addWorkspaceMember(t, { workspaceId: workspace.id, userId: memberId });
    const publicTask = await asOwner.mutation(api.tasks.create, {
      workspaceId: workspace.id,
      title: "Public",
    });
    const privateTask = await asOwner.mutation(api.tasks.create, {
      workspaceId: workspace.id,
      title: "Private",
      isPrivate: true,
    });

    await expect(
      asMember.mutation(api.tasks.removeMany, {
        workspaceId: workspace.id,
        taskIds: [publicTask.id, privateTask.id],
      }),
    ).rejects.toThrow("Forbidden: private task");
    expect(await asOwner.query(api.tasks.list, { workspaceId: workspace.id })).toHaveLength(2);

    await expect(
      asOwner.mutation(api.tasks.removeMany, {
        workspaceId: workspace.id,
        taskIds: [publicTask.id, privateTask.id],
      }),
    ).resolves.toEqual({ deleted: 2 });
    expect(await asOwner.query(api.tasks.list, { workspaceId: workspace.id })).toEqual([]);
  });
});
