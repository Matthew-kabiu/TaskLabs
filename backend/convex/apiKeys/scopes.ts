import type { WorkspaceRole } from "../lib/auth";

export const API_KEY_SCOPES = [
  "tasks:read",
  "tasks:write",
  "projects:read",
  "projects:write",
  "events:read",
  "events:write",
  "labels:read",
  "labels:write",
  "workspaces:read",
  "workspaces:admin",
  "members:read",
  "members:admin",
  "notifications:read",
  "notifications:write",
  "search:read",
  "profile:read",
  "profile:write",
  "telegram:read",
  "telegram:test",
  "system:read",
  "system:write",
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];

const SCOPE_SET = new Set<string>(API_KEY_SCOPES);
const ADMIN_SCOPES = new Set<ApiKeyScope>([
  "workspaces:admin",
  "members:admin",
]);
const SYSTEM_SCOPES = new Set<ApiKeyScope>(["system:read", "system:write"]);

const ROLE_RANK: Record<WorkspaceRole, number> = {
  MEMBER: 0,
  ADMIN: 1,
  OWNER: 2,
};

export function isApiKeyScope(value: string): value is ApiKeyScope {
  return SCOPE_SET.has(value);
}

export function normalizeApiKeyScopes(scopes: string[]) {
  const normalized = [...new Set(scopes.map((scope) => scope.trim()))];
  if (normalized.length < 1) {
    throw new Error("At least one API key scope is required");
  }
  const invalid = normalized.filter((scope) => !isApiKeyScope(scope));
  if (invalid.length > 0) {
    throw new Error("Invalid API key scope");
  }
  return API_KEY_SCOPES.filter((scope) => normalized.includes(scope));
}

export function assertScopesAllowedForActor(input: {
  scopes: ApiKeyScope[];
  workspaceRole: WorkspaceRole;
  platformRole: "ADMIN" | "MEMBER";
}) {
  if (
    input.scopes.some((scope) => ADMIN_SCOPES.has(scope)) &&
    ROLE_RANK[input.workspaceRole] < ROLE_RANK.ADMIN
  ) {
    throw new Error("Workspace admin scopes require ADMIN or OWNER role");
  }
  if (
    input.scopes.some((scope) => SYSTEM_SCOPES.has(scope)) &&
    input.platformRole !== "ADMIN"
  ) {
    throw new Error("System scopes require a platform admin");
  }
}

export function assertRequiredScopes(
  available: readonly ApiKeyScope[],
  required: readonly ApiKeyScope[],
) {
  for (const scope of required) {
    if (!available.includes(scope)) {
      throw new Error("Insufficient API key scope");
    }
  }
}
