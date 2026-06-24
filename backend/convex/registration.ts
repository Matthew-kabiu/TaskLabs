import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { claimCurrentUserRole, normalizeName } from "./lib/users";
import { getSystemSettingsRecord, systemSettingsDto } from "./settings/model";

export const status = query({
  args: {},
  handler: async (ctx) => systemSettingsDto(await getSystemSettingsRecord(ctx)),
});

export const complete = mutation({
  args: {
    name: v.optional(v.string()),
    workspaceName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await getSystemSettingsRecord(ctx);
    if (!settings?.allowPublicRegistration) {
      throw new Error("Public registration is disabled");
    }
    return await claimCurrentUserRole(ctx, {
      role: "MEMBER",
      name: args.name === undefined ? undefined : normalizeName(args.name),
      workspaceName: args.workspaceName,
    });
  },
});
