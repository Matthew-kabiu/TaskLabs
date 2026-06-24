import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireAdmin } from "./lib/users";
import {
  ensureSystemSettings,
  getSystemSettingsRecord,
  systemSettingsDto,
} from "./settings/model";

export const getSystem = query({
  args: {},
  handler: async (ctx) =>
    systemSettingsDto(await getSystemSettingsRecord(ctx)),
});

export const updateSystem = mutation({
  args: { allowPublicRegistration: v.boolean() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const settings = await ensureSystemSettings(ctx);
    await ctx.db.patch(settings._id, {
      allowPublicRegistration: args.allowPublicRegistration,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(settings._id);
    if (updated === null) throw new Error("System settings not found after update");
    return systemSettingsDto(updated);
  },
});
