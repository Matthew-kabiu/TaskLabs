'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/datetime';
import {
  Copy,
  KeyRound,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useWorkspaces } from '@/hooks/useWorkspaces';
import { BACKEND_ROUTES } from '@/lib/routes';

type ApiKeyScope =
  | 'tasks:read'
  | 'tasks:write'
  | 'projects:read'
  | 'projects:write'
  | 'events:read'
  | 'events:write'
  | 'labels:read'
  | 'labels:write'
  | 'workspaces:read'
  | 'workspaces:admin'
  | 'members:read'
  | 'members:admin'
  | 'notifications:read'
  | 'notifications:write'
  | 'search:read'
  | 'profile:read'
  | 'profile:write'
  | 'telegram:read'
  | 'telegram:test'
  | 'system:read'
  | 'system:write';

const SCOPE_GROUPS = [
  {
    label: 'Tasks',
    scopes: ['tasks:read', 'tasks:write'],
  },
  {
    label: 'Projects',
    scopes: ['projects:read', 'projects:write'],
  },
  {
    label: 'Calendar',
    scopes: ['events:read', 'events:write'],
  },
  {
    label: 'Workspace',
    scopes: [
      'labels:read',
      'labels:write',
      'workspaces:read',
      'workspaces:admin',
      'members:read',
      'members:admin',
    ],
  },
  {
    label: 'Account',
    scopes: [
      'notifications:read',
      'notifications:write',
      'search:read',
      'profile:read',
      'profile:write',
      'telegram:read',
      'telegram:test',
    ],
  },
  {
    label: 'System',
    scopes: ['system:read', 'system:write'],
  },
] as const satisfies readonly { label: string; scopes: readonly ApiKeyScope[] }[];

const ALL_SCOPES = SCOPE_GROUPS.flatMap((group) => group.scopes);

type ApiKeyRow = {
  id: Id<'apiKeys'>;
  name: string;
  prefix: string;
  scopes: ApiKeyScope[];
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
};

type CreatedKey = ApiKeyRow & { token: string };

function formatDate(value: string | null) {
  if (value === null) return 'Never';
  return formatDateTime(value, 'datetime');
}

function scopeLabel(scope: string) {
  return scope.replace(':', ' / ');
}

export function ApiKeysSection() {
  const { activeWorkspace, activeWorkspaceId, isLoading } = useWorkspaces();
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [expiryMode, setExpiryMode] = React.useState<'never' | 'date'>('never');
  const [expiresAt, setExpiresAt] = React.useState('');
  const [selected, setSelected] = React.useState<Set<ApiKeyScope>>(
    () => new Set(['tasks:read', 'tasks:write', 'search:read']),
  );
  const [oneTimeToken, setOneTimeToken] = React.useState<string | null>(null);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const keys = useQuery(
    BACKEND_ROUTES.apiKeys.list,
    activeWorkspaceId
      ? { workspaceId: activeWorkspaceId as Id<'workspaces'> }
      : 'skip',
  ) as ApiKeyRow[] | undefined;
  const createKey = useMutation(BACKEND_ROUTES.apiKeys.create);
  const revokeKey = useMutation(BACKEND_ROUTES.apiKeys.revoke);
  const rotateKey = useMutation(BACKEND_ROUTES.apiKeys.rotate);

  const allScopesSelected = selected.size === ALL_SCOPES.length;

  const resetCreateForm = () => {
    setName('');
    setExpiryMode('never');
    setExpiresAt('');
    setSelected(new Set(['tasks:read', 'tasks:write', 'search:read']));
  };

  const toggleScope = (scope: ApiKeyScope, checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) next.add(scope);
      else next.delete(scope);
      return next;
    });
  };

  const onCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeWorkspaceId) return;
    if (selected.size < 1) {
      toast.error('Select at least one scope.');
      return;
    }
    try {
      const created = (await createKey({
        workspaceId: activeWorkspaceId as Id<'workspaces'>,
        name,
        scopes: [...selected],
        expiresAt:
          expiryMode === 'date' && expiresAt
            ? new Date(expiresAt).toISOString()
            : undefined,
      })) as CreatedKey;
      setOneTimeToken(created.token);
      setOpen(false);
      resetCreateForm();
      toast.success('API key created.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not create API key.');
    }
  };

  const onCopy = async () => {
    if (oneTimeToken === null) return;
    await navigator.clipboard.writeText(oneTimeToken);
    toast.success('API key copied.');
  };

  const onRotate = async (keyId: Id<'apiKeys'>) => {
    setPendingId(keyId);
    try {
      const rotated = (await rotateKey({ keyId })) as CreatedKey;
      setOneTimeToken(rotated.token);
      toast.success('API key rotated.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not rotate API key.');
    } finally {
      setPendingId(null);
    }
  };

  const onRevoke = async (keyId: Id<'apiKeys'>) => {
    setPendingId(keyId);
    try {
      await revokeKey({ keyId });
      toast.success('API key revoked.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke API key.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-medium">
            <KeyRound className="h-5 w-5 text-muted-foreground" />
            API keys
          </h2>
          <p className="text-sm text-muted-foreground">
            Create workspace-scoped bearer keys for MCP clients and automation.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" disabled={!activeWorkspaceId}>
              <KeyRound className="h-4 w-4" />
              New key
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={onCreate} className="space-y-5">
              <DialogHeader>
                <DialogTitle>Create API key</DialogTitle>
                <DialogDescription>
                  The key is shown once. Store it in your MCP client or secret
                  manager before closing this dialog.
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="api-key-name">Name</Label>
                  <Input
                    id="api-key-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Local MCP client"
                    required
                    maxLength={80}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="api-key-expiry">Expires</Label>
                  <Select
                    value={expiryMode}
                    onValueChange={(value) => {
                      const mode = value === 'date' ? 'date' : 'never';
                      setExpiryMode(mode);
                      if (mode === 'never') setExpiresAt('');
                    }}
                  >
                    <SelectTrigger id="api-key-expiry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="never">Never</SelectItem>
                      <SelectItem value="date">On a date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {expiryMode === 'date' && (
                <div className="space-y-1.5">
                  <Label htmlFor="api-key-expiry-date">Expiry date</Label>
                  <Input
                    id="api-key-expiry-date"
                    type="datetime-local"
                    value={expiresAt}
                    onChange={(event) => setExpiresAt(event.target.value)}
                    required
                  />
                </div>
              )}

              <div className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ShieldCheck className="h-4 w-4 text-muted-foreground" />
                    Scopes
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setSelected(new Set(ALL_SCOPES))}
                      disabled={allScopesSelected}
                    >
                      Select all
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelected(new Set())}
                      disabled={selected.size === 0}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <label className="flex w-fit items-center gap-2 text-sm">
                  <Checkbox
                    checked={
                      allScopesSelected
                        ? true
                        : selected.size > 0
                          ? 'indeterminate'
                          : false
                    }
                    onCheckedChange={(checked) =>
                      setSelected(checked === true ? new Set(ALL_SCOPES) : new Set())
                    }
                  />
                  <span>Select all scopes</span>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {SCOPE_GROUPS.map((group) => (
                    <div key={group.label} className="rounded-md border p-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="space-y-2">
                        {group.scopes.map((scope) => (
                          <label
                            key={scope}
                            className="flex items-center gap-2 text-sm"
                          >
                            <Checkbox
                              checked={selected.has(scope)}
                              onCheckedChange={(checked) =>
                                toggleScope(scope, checked === true)
                              }
                            />
                            <span className="font-mono text-xs">
                              {scopeLabel(scope)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={
                    name.trim().length < 1 ||
                    selected.size < 1 ||
                    (expiryMode === 'date' && expiresAt.length < 1)
                  }
                >
                  Create key
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </header>

      {oneTimeToken !== null && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Copy this key now</p>
            <Button type="button" size="sm" variant="outline" onClick={onCopy}>
              <Copy className="h-4 w-4" />
              Copy
            </Button>
          </div>
          <code className="block overflow-x-auto rounded-md bg-background p-3 font-mono text-xs">
            {oneTimeToken}
          </code>
        </div>
      )}

      <div className="rounded-lg border bg-card">
        <div className="border-b px-4 py-3 text-sm text-muted-foreground">
          {isLoading || keys === undefined
            ? 'Loading keys...'
            : `${keys.length} key${keys.length === 1 ? '' : 's'} for ${
                activeWorkspace?.name ?? 'this workspace'
              }`}
        </div>
        <div className="divide-y">
          {(keys ?? []).map((key) => {
            const disabled = pendingId === key.id || key.revokedAt !== null;
            return (
              <div
                key={key.id}
                className="grid gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_auto]"
              >
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{key.name}</p>
                    <Badge variant={key.revokedAt ? 'destructive' : 'secondary'}>
                      {key.revokedAt ? 'revoked' : 'active'}
                    </Badge>
                    <span className="font-mono text-xs text-muted-foreground">
                      tlk_live_{key.prefix}_...
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {key.scopes.map((scope) => (
                      <Badge key={scope} variant="outline" className="font-mono">
                        {scope}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(key.createdAt)} · Last used{' '}
                    {formatDate(key.lastUsedAt)} · Expires{' '}
                    {formatDate(key.expiresAt)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <span className="w-full text-xs uppercase tracking-[0.14em] text-muted-foreground lg:text-right">
                    Actions
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={disabled}
                    onClick={() => onRotate(key.id)}
                  >
                    {pendingId === key.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    Rotate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    disabled={disabled}
                    onClick={() => onRevoke(key.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                    Revoke
                  </Button>
                </div>
              </div>
            );
          })}
          {keys?.length === 0 && (
            <div className="p-6 text-sm text-muted-foreground">
              No API keys exist for this workspace.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
