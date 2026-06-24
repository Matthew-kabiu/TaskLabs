import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { claimCurrentUserRole, hasAnyAdmin, normalizeName } from "./lib/users";

export const status = query({
  args: {},
  handler: async (ctx) => {
    const adminExists = await hasAnyAdmin(ctx);
    return { setupNeeded: !adminExists };
  },
});

export const claimAdmin = mutation({
  args: {
    name: v.optional(v.string()),
    workspaceName: v.string(),
  },
  handler: async (ctx, args) => {
    if (await hasAnyAdmin(ctx)) {
      throw new Error("Setup already complete");
    }
    return await claimCurrentUserRole(ctx, {
      role: "ADMIN",
      name: args.name === undefined ? undefined : normalizeName(args.name),
      workspaceName: args.workspaceName,
    });
  },
});
