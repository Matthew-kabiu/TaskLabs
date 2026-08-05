'use client';

import { useState } from 'react';
import { useMutation, useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Check, Clock3, Copy, Mail, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { formatDateTime } from '@/lib/datetime';
import type { WorkspaceRole } from '@/hooks/useWorkspaces';

type PendingInvitation = {
  id: string;
  email: string;
  role: 'MEMBER' | 'ADMIN';
  createdAt: string;
  expiresAt: string;
};

export function PendingInvitations({
  workspaceId,
  actorRole,
}: {
  workspaceId: string;
  actorRole: WorkspaceRole;
}) {
  const invitations = useQuery(BACKEND_ROUTES.invitations.pending, {
    workspaceId: workspaceId as Id<'workspaces'>,
  }) as PendingInvitation[] | undefined;
  const resendInvitation = useMutation(BACKEND_ROUTES.invitations.resend);
  const revokeInvitation = useMutation(BACKEND_ROUTES.invitations.revoke);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<PendingInvitation | null>(null);
  const [resentLink, setResentLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function resend(invitation: PendingInvitation) {
    setBusyId(invitation.id);
    try {
      const result = (await resendInvitation({
        workspaceId: workspaceId as Id<'workspaces'>,
        invitationId: invitation.id as Id<'invitations'>,
      })) as { token: string; invitePath?: string };
      setResentLink(`${window.location.origin}${result.invitePath ?? ROUTES.app.invite(result.token)}`);
      toast.success('Invitation link regenerated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not resend invitation');
    } finally {
      setBusyId(null);
    }
  }

  async function revoke() {
    if (!revokeTarget) return;
    setBusyId(revokeTarget.id);
    try {
      await revokeInvitation({
        workspaceId: workspaceId as Id<'workspaces'>,
        invitationId: revokeTarget.id as Id<'invitations'>,
      });
      toast.success('Invitation revoked');
      setRevokeTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not revoke invitation');
    } finally {
      setBusyId(null);
    }
  }

  async function copyLink() {
    if (!resentLink) return;
    await navigator.clipboard.writeText(resentLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_500);
  }

  if (invitations === undefined) {
    return <div className="rounded-xl border p-4 text-sm text-muted-foreground">Loading invitations…</div>;
  }

  if (invitations.length === 0) {
    return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">No pending invitations.</div>;
  }

  return (
    <>
      <ul className="divide-y rounded-xl border border-border/60 bg-card/30">
        {invitations.map((invitation) => {
          const canManage = invitation.role === 'MEMBER' || actorRole === 'OWNER';
          return (
            <li key={invitation.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-500/10 text-sky-400 ring-1 ring-sky-500/20"><Mail className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><p className="truncate text-sm font-medium">{invitation.email}</p><Badge variant="outline">{invitation.role.toLowerCase()}</Badge></div>
                <p className="text-xs text-muted-foreground">Invited {formatDateTime(invitation.createdAt, 'date')}</p>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> Expires {formatDateTime(invitation.expiresAt, 'date')}</span>
              {canManage ? (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" disabled={busyId === invitation.id} onClick={() => resend(invitation)}><RefreshCw className="h-4 w-4" /> Resend</Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive" disabled={busyId === invitation.id} onClick={() => setRevokeTarget(invitation)}><Trash2 className="h-4 w-4" /> Revoke</Button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Dialog open={resentLink !== null} onOpenChange={(open) => !open && setResentLink(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>New invitation link</DialogTitle><DialogDescription>The previous link is invalid. Share this replacement link now.</DialogDescription></DialogHeader>
          <div className="flex gap-2"><Input readOnly value={resentLink ?? ''} onFocus={(event) => event.currentTarget.select()} /><Button onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy'}</Button></div>
          <DialogFooter><Button onClick={() => setResentLink(null)}>Done</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={revokeTarget !== null} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Revoke invitation?</DialogTitle><DialogDescription>The invitation link for {revokeTarget?.email} will stop working immediately.</DialogDescription></DialogHeader>
          <DialogFooter><Button variant="outline" onClick={() => setRevokeTarget(null)}>Cancel</Button><Button variant="destructive" disabled={!revokeTarget || busyId === revokeTarget.id} onClick={revoke}>Revoke invitation</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
