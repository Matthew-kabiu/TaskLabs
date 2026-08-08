import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { ConvexError } from "convex/values";
import {
  requireMembership,
  requireUserId,
  type WorkspaceRole,
  UnauthorizedError,
} from "../lib/auth";
import { tasklabsRateLimiter } from "../lib/rateLimits";
import {
  apiKeyMetadataDto,
  getApiKeyByPrefix,
  getApiKeyForOwner,
  insertApiKey,
  listApiKeysForUserWorkspace,
  type ApiKeyActor,
} from "./model";
import {
  assertRequiredScopes,
  assertScopesAllowedForActor,
  normalizeApiKeyScopes,
  type ApiKeyScope,
} from "./scopes";
import {
  constantTimeEqual,
  generateApiKeyToken,
  hashApiKeyToken,
  parseApiKeyToken,
} from "./token";

type CreateApiKeyInput = {
  workspaceId: Id<"workspaces">;
  name: string;
  scopes: string[];
  expiresAt?: number | string | null;
};

function normalizeExpiresAt(value?: number | string | null) {
  if (value === undefined || value === null) return undefined;
  const expiresAt = typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(expiresAt)) {
    throw new Error("API key expiry must be an ISO date string or epoch milliseconds");
  }
  if (expiresAt <= Date.now()) {
    throw new Error("API key expiry must be in the future");
  }
  return expiresAt;
}

async function userPlatformRole(ctx: QueryCtx | MutationCtx, userId: Id<"users">) {
  const user = await ctx.db.get(userId);
  if (user === null) {
    throw new UnauthorizedError();
  }
  return user.platformRole ?? "MEMBER";
}

async function managementLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  workspaceId: Id<"workspaces">,
) {
  await tasklabsRateLimiter.limit(ctx, "apiKeyManagement", {
    key: `${userId}:${workspaceId}`,
    throws: true,
  });
}

async function verificationLimit(ctx: MutationCtx, key: string) {
  const result = await tasklabsRateLimiter.limit(ctx, "apiKeyVerify", {
    key,
  });
  if (!result.ok) {
    throw new ConvexError({
      kind: "RateLimited",
      name: "apiKeyVerify",
      retryAfter: result.retryAfter,
    });
  }
}

function invalidApiKey(): never {
  throw new ConvexError({
    kind: "ApiKeyUnauthorized",
    message: "Invalid API key",
  });
}

async function generateUniqueToken(ctx: MutationCtx) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const generated = generateApiKeyToken();
    const existing = await getApiKeyByPrefix(ctx, generated.prefix);
    if (existing === null) return generated;
  }
  throw new Error("Could not generate an API key prefix");
}

export async function listMyApiKeys(
  ctx: QueryCtx,
  workspaceId: Id<"workspaces">,
) {
  const { userId } = await requireMembership(ctx, workspaceId);
  const rows = await listApiKeysForUserWorkspace(ctx, { userId, workspaceId });
  return rows
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(apiKeyMetadataDto);
}

export async function createApiKey(ctx: MutationCtx, input: CreateApiKeyInput) {
  const { userId, membership } = await requireMembership(ctx, input.workspaceId);
  await managementLimit(ctx, userId, input.workspaceId);
  const platformRole = await userPlatformRole(ctx, userId);
  const scopes = normalizeApiKeyScopes(input.scopes);
  assertScopesAllowedForActor({
    scopes,
    workspaceRole: membership.role,
    platformRole,
  });

  const now = Date.now();
  const generated = await generateUniqueToken(ctx);
  const key = await insertApiKey(ctx, {
    userId,
    workspaceId: input.workspaceId,
    name: input.name,
    prefix: generated.prefix,
    secretHash: await hashApiKeyToken(generated.token),
    scopes,
    expiresAt: normalizeExpiresAt(input.expiresAt),
    now,
  });
  return {
    ...apiKeyMetadataDto(key),
    token: generated.token,
  };
}

export async function revokeApiKey(
  ctx: MutationCtx,
  keyId: Id<"apiKeys">,
) {
  const userId = await requireUserId(ctx);
  const row = await getApiKeyForOwner(ctx, { keyId, userId });
  await requireMembership(ctx, row.workspaceId);
  await managementLimit(ctx, userId, row.workspaceId);
  const idempotencyRows = await ctx.db
    .query("mcpIdempotency")
    .withIndex("by_api_key", (q) => q.eq("apiKeyId", keyId))
    .collect();
  for (const idempotencyRow of idempotencyRows) {
    await ctx.db.delete(idempotencyRow._id);
  }
  await ctx.db.delete(keyId);
  return null;
}

export async function rotateApiKey(
  ctx: MutationCtx,
  keyId: Id<"apiKeys">,
) {
  const userId = await requireUserId(ctx);
  const row = await getApiKeyForOwner(ctx, { keyId, userId });
  await requireMembership(ctx, row.workspaceId);
  await managementLimit(ctx, userId, row.workspaceId);
  if (row.revokedAt !== undefined) {
    throw new Error("Cannot rotate a revoked API key");
  }
  const generated = await generateUniqueToken(ctx);
  await ctx.db.patch(keyId, {
    prefix: generated.prefix,
    secretHash: await hashApiKeyToken(generated.token),
    lastUsedAt: undefined,
    updatedAt: Date.now(),
  });
  const updated = await ctx.db.get(keyId);
  if (updated === null) {
    throw new Error("API key not found after rotate");
  }
  return {
    ...apiKeyMetadataDto(updated),
    token: generated.token,
  };
}

export async function verifyApiKeyToken(
  ctx: MutationCtx,
  token: string,
  requiredScopes: ApiKeyScope[] = [],
): Promise<ApiKeyActor> {
  let prefix: string;
  try {
    prefix = parseApiKeyToken(token).prefix;
  } catch {
    invalidApiKey();
  }

  await verificationLimit(ctx, prefix);

  const row = await getApiKeyByPrefix(ctx, prefix);
  if (row === null) {
    invalidApiKey();
  }
  const hash = await hashApiKeyToken(token);
  if (!constantTimeEqual(hash, row.secretHash)) {
    invalidApiKey();
  }
  if (row.revokedAt !== undefined) {
    invalidApiKey();
  }
  if (row.expiresAt !== undefined && row.expiresAt <= Date.now()) {
    invalidApiKey();
  }

  assertRequiredScopes(row.scopes, requiredScopes);
  const user = await ctx.db.get(row.userId);
  if (user === null) {
    invalidApiKey();
  }
  const membership = await ctx.db
    .query("workspaceMembers")
    .withIndex("by_workspace_user", (q) =>
      q.eq("workspaceId", row.workspaceId).eq("userId", row.userId),
    )
    .unique();
  if (membership === null) {
    invalidApiKey();
  }
  await ctx.db.patch(row._id, {
    lastUsedAt: Date.now(),
    updatedAt: Date.now(),
  });

  return {
    authType: "apiKey",
    userId: row.userId,
    workspaceId: row.workspaceId,
    apiKeyId: row._id,
    scopes: row.scopes,
    workspaceRole: membership.role as WorkspaceRole,
    platformRole: user.platformRole ?? "MEMBER",
  };
}
