'use client';

import * as React from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/datetime';
import {
  Activity,
  CalendarClock,
  ChevronDown,
  Copy,
  KeyRound,
  Loader2,
  Plus,
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
  const [deleteTarget, setDeleteTarget] = React.useState<ApiKeyRow | null>(null);

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
      setDeleteTarget(null);
      toast.success('API key revoked and deleted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke API key.');
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-4 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20">
            <KeyRound className="h-5 w-5" />
          </span>
          <div className="space-y-1">
          <h2 className="text-lg font-semibold">API keys</h2>
          <p className="text-sm text-muted-foreground">
            Create workspace-scoped bearer keys for MCP clients and automation.
          </p>
          </div>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2" disabled={!activeWorkspaceId}>
              <Plus className="h-4 w-4" />
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

      <div className="overflow-hidden rounded-xl border border-border/60 bg-card/30">
        <div className="flex items-center justify-between gap-3 border-b border-border/60 bg-muted/20 px-4 py-3">
          <p className="text-sm font-medium">Workspace keys</p>
          <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {isLoading || keys === undefined
              ? 'Loading keys...'
              : `${keys.length} key${keys.length === 1 ? '' : 's'} for ${
                  activeWorkspace?.name ?? 'this workspace'
                }`}
          </span>
        </div>
        <ul className="divide-y divide-border/60">
          {(keys ?? []).map((key) => {
            const pending = pendingId === key.id;
            const revoked = key.revokedAt !== null;
            return (
              <li
                key={key.id}
                className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/15 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-center"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg border border-border/60 bg-background text-muted-foreground">
                  <KeyRound className="h-4 w-4" />
                </span>
                <div className="min-w-0 space-y-2.5">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{key.name}</p>
                    <Badge variant={revoked ? 'destructive' : 'secondary'} className="text-[10px] uppercase tracking-[0.1em]">
                      {revoked ? 'Revoked' : 'Active'}
                    </Badge>
                    <code className="truncate font-mono text-xs text-muted-foreground">
                      tlk_live_{key.prefix}_...
                    </code>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarClock className="h-3.5 w-3.5" /> Created {formatDate(key.createdAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Activity className="h-3.5 w-3.5" /> Last used {formatDate(key.lastUsedAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <ShieldCheck className="h-3.5 w-3.5" /> Expires {formatDate(key.expiresAt)}
                    </span>
                  </div>
                  <details className="group/scopes">
                    <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
                      <ChevronDown className="h-3.5 w-3.5 transition-transform group-open/scopes:rotate-180" />
                      {key.scopes.length} permission{key.scopes.length === 1 ? '' : 's'}
                    </summary>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="outline" className="font-mono text-[10px] font-normal">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </details>
                </div>
                <div className="flex items-center gap-2 md:justify-end">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pending || revoked}
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
                    disabled={pending}
                    onClick={() => setDeleteTarget(key)}
                  >
                    <Trash2 className="h-4 w-4" />
                    {revoked ? 'Delete' : 'Revoke & delete'}
                  </Button>
                </div>
              </li>
            );
          })}
          {keys?.length === 0 && (
            <li className="flex flex-col items-center gap-2 px-6 py-10 text-center">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
                <KeyRound className="h-4 w-4" />
              </span>
              <p className="text-sm font-medium">No API keys yet</p>
              <p className="text-xs text-muted-foreground">Create a key to connect an MCP client or automation.</p>
            </li>
          )}
        </ul>
      </div>

      <Dialog open={deleteTarget !== null} onOpenChange={(next) => !next && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{deleteTarget?.revokedAt ? 'Delete API key?' : 'Revoke and delete API key?'}</DialogTitle>
            <DialogDescription>
              “{deleteTarget?.name ?? 'This key'}” {deleteTarget?.revokedAt ? 'is already inactive and will be' : 'will stop working immediately and be'} permanently removed from this list. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={deleteTarget !== null && pendingId === deleteTarget.id}
              onClick={() => deleteTarget && onRevoke(deleteTarget.id)}
            >
              {deleteTarget !== null && pendingId === deleteTarget.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {deleteTarget?.revokedAt ? 'Delete key' : 'Revoke & delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
