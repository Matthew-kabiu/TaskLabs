import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import {
  requireMembership,
  requireMembershipForUser,
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
  await tasklabsRateLimiter.limit(ctx, "apiKeyVerify", {
    key,
    throws: true,
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
  if (row.revokedAt === undefined) {
    const now = Date.now();
    await ctx.db.patch(keyId, {
      revokedAt: now,
      updatedAt: now,
    });
  }
  const updated = await ctx.db.get(keyId);
  if (updated === null) {
    throw new Error("API key not found after revoke");
  }
  return apiKeyMetadataDto(updated);
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
    throw new UnauthorizedError("Invalid API key");
  }

  await verificationLimit(ctx, prefix);

  const row = await getApiKeyByPrefix(ctx, prefix);
  if (row === null) {
    throw new UnauthorizedError("Invalid API key");
  }
  const hash = await hashApiKeyToken(token);
  if (!constantTimeEqual(hash, row.secretHash)) {
    throw new UnauthorizedError("Invalid API key");
  }
  if (row.revokedAt !== undefined) {
    throw new UnauthorizedError("Invalid API key");
  }
  if (row.expiresAt !== undefined && row.expiresAt <= Date.now()) {
    throw new UnauthorizedError("Invalid API key");
  }

  assertRequiredScopes(row.scopes, requiredScopes);
  const user = await ctx.db.get(row.userId);
  if (user === null) {
    throw new UnauthorizedError("Invalid API key");
  }
  const membership = await requireMembershipForUser(
    ctx,
    row.workspaceId,
    row.userId,
  );
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
