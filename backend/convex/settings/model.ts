import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = QueryCtx | MutationCtx;

const SYSTEM_KEY = "singleton";

export async function getSystemSettingsRecord(ctx: DbCtx) {
  const existing = await ctx.db
    .query("systemSettings")
    .withIndex("by_key", (q) => q.eq("key", SYSTEM_KEY))
    .unique();
  return existing;
}

export async function ensureSystemSettings(ctx: MutationCtx) {
  const existing = await getSystemSettingsRecord(ctx);
  if (existing !== null) return existing;
  const id = await ctx.db.insert("systemSettings", {
    key: SYSTEM_KEY,
    allowPublicRegistration: false,
    updatedAt: Date.now(),
  });
  const created = await ctx.db.get(id);
  if (created === null) throw new Error("System settings not found after create");
  return created;
}

export function systemSettingsDto(
  settings: Awaited<ReturnType<typeof getSystemSettingsRecord>>,
) {
  return {
    allowPublicRegistration: settings?.allowPublicRegistration ?? false,
    updatedAt:
      settings === null
        ? null
        : new Date(settings.updatedAt).toISOString(),
  };
}
