import { generateKeyPairSync } from "node:crypto";
import { convexTest } from "convex-test";
import { afterEach, describe, expect, test, vi } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob(["./**/*.{ts,js}", "!./**/*.test.ts"]);
const apiAny = api as any;
process.env.JWT_PRIVATE_KEY = generateKeyPairSync("rsa", {
  modulusLength: 2048,
}).privateKey.export({ type: "pkcs8", format: "pem" }).toString();
process.env.CONVEX_SITE_URL = "https://convex-site.test";
process.env.TELEGRAM_API_ORIGIN = "https://api.telegram.test";
process.env.TELEGRAM_WEBHOOK_ORIGIN = "https://convex-site.test";

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

async function addWorkspaceMember(
  t: ReturnType<typeof convexTest>,
  input: {
    workspaceId: Id<"workspaces">;
    userId: Id<"users">;
    role?: "OWNER" | "ADMIN" | "MEMBER";
  },
) {
  await t.run(async (ctx) => {
    await ctx.db.insert("workspaceMembers", {
      workspaceId: input.workspaceId,
      userId: input.userId,
      role: input.role ?? "MEMBER",
      joinedAt: Date.now(),
    });
  });
}

async function getUserSession(
  t: ReturnType<typeof convexTest>,
  email: string,
) {
  return await t.run(async (ctx) => {
    const user =
      (await ctx.db.query("users").collect()).find(
        (row) => row.email === email,
      ) ?? null;
    if (user === null) throw new Error(`Expected user ${email}`);
    const session =
      (await ctx.db.query("authSessions").collect()).find(
        (row) => row.userId === user._id,
      ) ?? null;
    if (session === null) throw new Error(`Expected session for ${email}`);
    return { userId: user._id, sessionId: session._id };
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Convex backend domain ports", () => {
  test("labels attach to tasks and task assignments create notifications", async () => {
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
    const asMember = t.withIdentity({
      subject: memberId,
      email: "member@example.com",
    });

    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Team",
      }),
      "workspace",
    );
    await addWorkspaceMember(t, { workspaceId: workspace.id, userId: memberId });

    const label = await asOwner.mutation(apiAny.labels.create, {
      workspaceId: workspace.id,
      name: "Bug",
      color: "#EF4444",
    });
    const task = await asOwner.mutation(apiAny.tasks.create, {
      workspaceId: workspace.id,
      title: "Fix import",
      labelIds: [label.id],
      assigneeIds: [memberId],
    });

    expect(task.labels).toMatchObject([{ name: "Bug", color: "#ef4444" }]);
    expect(task.assignees).toMatchObject([{ userId: memberId }]);
    expect(await asMember.query(apiAny.notifications.unread, {})).toBe(1);
    const notifications = await asMember.query(apiAny.notifications.list, {});
    expect(notifications[0]).toMatchObject({ type: "TASK_ASSIGNED" });
    await asMember.mutation(apiAny.notifications.markAllRead, {});
    expect(await asMember.query(apiAny.notifications.unread, {})).toBe(0);
  });

  test("calendar events respect private visibility and feed search", async () => {
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
    const asMember = t.withIdentity({
      subject: memberId,
      email: "member@example.com",
    });
    const workspace = requireValue(
      await asOwner.mutation(apiAny.workspaces.ensurePersonal, {
        name: "Calendar",
      }),
      "workspace",
    );
    await addWorkspaceMember(t, { workspaceId: workspace.id, userId: memberId });

    await asOwner.mutation(apiAny.events.create, {
      workspaceId: workspace.id,
      title: "Public planning",
      startAt: "2026-07-01T10:00:00.000Z",
      endAt: "2026-07-01T11:00:00.000Z",
      color: "blue",
    });
    const privateEvent = await asOwner.mutation(apiAny.events.create, {
      workspaceId: workspace.id,
      title: "Private planning",
      startAt: "2026-07-01T12:00:00.000Z",
      endAt: "2026-07-01T13:00:00.000Z",
      isPrivate: true,
    });

    const memberEvents = await asMember.query(apiAny.events.list, {
      workspaceId: workspace.id,
      from: "2026-07-01T00:00:00.000Z",
      to: "2026-07-02T00:00:00.000Z",
    });
    expect(memberEvents.map((event: { title: string }) => event.title)).toEqual([
      "Public planning",
    ]);

    await asOwner.mutation(apiAny.events.complete, {
      workspaceId: workspace.id,
      eventId: privateEvent.id,
      completed: true,
    });
    expect(await asOwner.query(apiAny.notifications.unread, {})).toBe(1);

    const search = await asOwner.query(apiAny.search.workspace, {
      workspaceId: workspace.id,
      q: "planning",
    });
    expect(search.events).toHaveLength(2);
  });

  test("setup, registration, invitations, profile, and telegram metadata work", async () => {
    const t = convexTest(schema, modules);
    const adminId = await seedUser(t, {
      email: "admin@example.com",
      name: "Admin",
    });
    const memberId = await seedUser(t, {
      email: "member@example.com",
      name: "Member",
    });
    const inviteeId = await seedUser(t, {
      email: "invitee@example.com",
      name: "Invitee",
    });
    const asAdmin = t.withIdentity({ subject: adminId, email: "admin@example.com" });
    const asMember = t.withIdentity({
      subject: memberId,
      email: "member@example.com",
    });
    const asInvitee = t.withIdentity({
      subject: inviteeId,
      email: "invitee@example.com",
    });

    expect(await asAdmin.query(apiAny.setup.status, {})).toEqual({
      setupNeeded: true,
    });
    await asAdmin.mutation(apiAny.setup.claimAdmin, {
      name: "Admin",
      workspaceName: "Admin Workspace",
    });
    await asAdmin.mutation(apiAny.settings.updateSystem, {
      allowPublicRegistration: true,
    });
    await asMember.mutation(apiAny.registration.complete, {
      name: "Member",
      workspaceName: "Member Workspace",
    });
    const adminWorkspace = requireValue(
      await asAdmin.query(apiAny.workspaces.defaultWorkspace, {}),
      "admin workspace",
    );
    const invitation = await asAdmin.mutation(apiAny.invitations.create, {
      workspaceId: adminWorkspace.id,
      email: "invitee@example.com",
    });
    expect(invitation.invitePath).toContain(invitation.token);
    const valid = await asInvitee.query(apiAny.invitations.validate, {
      token: invitation.token,
    });
    expect(valid.email).toBe("invitee@example.com");
    await asInvitee.mutation(apiAny.invitations.accept, {
      token: invitation.token,
    });
    const members = await asAdmin.query(apiAny.workspaces.members, {
      workspaceId: adminWorkspace.id,
    });
    expect(members.map((member: { userId: string }) => member.userId)).toContain(
      inviteeId,
    );

    await asInvitee.mutation(apiAny.profile.update, {
      themePreference: "DARK",
      notifyLeadMinutesTask: [1440, 60, 60],
    });
    const profile = await asInvitee.query(apiAny.profile.get, {});
    expect(profile).toMatchObject({
      themePreference: "DARK",
      notifyLeadMinutesTask: [60, 1440],
    });

    await asInvitee.mutation(apiAny.telegram.saveToken, {
      token: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd",
    });
    await asInvitee.mutation(apiAny.telegram.linkChat, { chatId: "42" });
    const summary = await asInvitee.query(apiAny.telegram.tokenSummary, {});
    expect(summary).toMatchObject({ hasToken: true, chatLinked: true });
  });

  test("password changes verify the current Convex Auth password", async () => {
    const t = convexTest(schema, modules);
    const email = "password@example.com";
    await t.action(apiAny.auth.signIn, {
      provider: "password",
      params: {
        email,
        password: "old-password",
        flow: "signUp",
      },
    });
    const { userId, sessionId } = await getUserSession(t, email);
    const asUser = t.withIdentity({
      subject: `${userId}|${sessionId}`,
      email,
    });

    await asUser.action(apiAny.profile.changePassword, {
      currentPassword: "old-password",
      newPassword: "new-password",
    });

    await expect(
      asUser.action(apiAny.profile.changePassword, {
        currentPassword: "old-password",
        newPassword: "newer-password",
      }),
    ).rejects.toThrow("Invalid current password");

    await asUser.action(apiAny.profile.changePassword, {
      currentPassword: "new-password",
      newPassword: "newer-password",
    });
  }, 15_000);

  test("telegram link action uses env origins and latest /start update", async () => {
    const t = convexTest(schema, modules);
    const userId = await seedUser(t, {
      email: "telegram@example.com",
      name: "Telegram",
    });
    const asUser = t.withIdentity({
      subject: userId,
      email: "telegram@example.com",
    });
    await asUser.mutation(apiAny.telegram.saveToken, {
      token: "123456789:ABCDEFGHIJKLMNOPQRSTUVWXYZabcd",
    });

    const fetchMock = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.timeout === 0) {
        return Response.json({
          ok: true,
          result: [
            { update_id: 1, message: { chat: { id: 11 }, text: "/start", date: 100 } },
            { update_id: 2, message: { chat: { id: 22 }, text: "hi", date: 200 } },
            { update_id: 3, message: { chat: { id: 33 }, text: "/start", date: 300 } },
          ],
        });
      }
      return Response.json({ ok: true, result: true });
    });
    vi.stubGlobal("fetch", fetchMock);

    await asUser.action(apiAny.telegram.linkChatFromStart, {});

    const summary = await asUser.query(apiAny.telegram.tokenSummary, {});
    expect(summary).toMatchObject({ hasToken: true, chatLinked: true });
    const setWebhookCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("/setWebhook"),
    );
    expect(setWebhookCall).toBeDefined();
    const setWebhookBody = JSON.parse(String(setWebhookCall?.[1]?.body));
    expect(setWebhookBody).toMatchObject({
      url: `https://convex-site.test/telegram/webhook/${userId}`,
      allowed_updates: ["message"],
    });
    expect(setWebhookBody.secret_token).toEqual(expect.any(String));
  });
});
