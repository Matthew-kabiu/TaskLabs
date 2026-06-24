import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { ApiKeyScope } from "./scopes";

type DbCtx = QueryCtx | MutationCtx;

export type ApiKeyActor = {
  authType: "apiKey";
  userId: Id<"users">;
  workspaceId: Id<"workspaces">;
  apiKeyId: Id<"apiKeys">;
  scopes: ApiKeyScope[];
  workspaceRole: "OWNER" | "ADMIN" | "MEMBER";
  platformRole: "ADMIN" | "MEMBER";
};

export function normalizeApiKeyName(name: string) {
  const trimmed = name.trim();
  if (trimmed.length < 1) {
    throw new Error("API key name is required");
  }
  if (trimmed.length > 80) {
    throw new Error("API key name must be at most 80 characters");
  }
  return trimmed;
}

export function apiKeyMetadataDto(row: Doc<"apiKeys">) {
  return {
    id: row._id,
    workspaceId: row.workspaceId,
    name: row.name,
    prefix: row.prefix,
    scopes: row.scopes,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    expiresAt:
      row.expiresAt === undefined ? null : new Date(row.expiresAt).toISOString(),
    lastUsedAt:
      row.lastUsedAt === undefined ? null : new Date(row.lastUsedAt).toISOString(),
    revokedAt:
      row.revokedAt === undefined ? null : new Date(row.revokedAt).toISOString(),
  };
}

export async function insertApiKey(
  ctx: MutationCtx,
  input: {
    userId: Id<"users">;
    workspaceId: Id<"workspaces">;
    name: string;
    prefix: string;
    secretHash: string;
    scopes: ApiKeyScope[];
    expiresAt?: number;
    now: number;
  },
) {
  const keyId = await ctx.db.insert("apiKeys", {
    userId: input.userId,
    workspaceId: input.workspaceId,
    name: normalizeApiKeyName(input.name),
    prefix: input.prefix,
    secretHash: input.secretHash,
    scopes: input.scopes,
    expiresAt: input.expiresAt,
    createdAt: input.now,
    updatedAt: input.now,
  });
  const key = await ctx.db.get(keyId);
  if (key === null) {
    throw new Error("API key not found after create");
  }
  return key;
}

export async function listApiKeysForUserWorkspace(
  ctx: DbCtx,
  input: { userId: Id<"users">; workspaceId: Id<"workspaces"> },
) {
  return await ctx.db
    .query("apiKeys")
    .withIndex("by_user_workspace", (q) =>
      q.eq("userId", input.userId).eq("workspaceId", input.workspaceId),
    )
    .collect();
}

export async function getApiKeyForOwner(
  ctx: DbCtx,
  input: {
    keyId: Id<"apiKeys">;
    userId: Id<"users">;
  },
) {
  const row = await ctx.db.get(input.keyId);
  if (row === null || row.userId !== input.userId) {
    throw new Error("API key not found");
  }
  return row;
}

export async function getApiKeyByPrefix(ctx: DbCtx, prefix: string) {
  return await ctx.db
    .query("apiKeys")
    .withIndex("by_prefix", (q) => q.eq("prefix", prefix))
    .unique();
}
