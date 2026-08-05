// app/(app)/settings/workspace/invite-dialog.tsx
'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Check, Copy, Link2, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogDescription, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import type { WorkspaceRole } from '@/hooks/useWorkspaces';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function InviteDialog({
  workspaceId,
  actorRole,
}: {
  workspaceId: string;
  actorRole: WorkspaceRole;
}) {
  const createInvitation = useMutation(BACKEND_ROUTES.invitations.create);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'MEMBER' | 'ADMIN'>('MEMBER');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null); setLink(null); setCopied(false);
    try {
      const data = (await createInvitation({
        workspaceId: workspaceId as Id<'workspaces'>,
        email,
        role,
      })) as { token: string; invitePath?: string };
      const path = data.invitePath ?? ROUTES.app.invite(data.token);
      setLink(`${window.location.origin}${path}`);
      toast.success('Invitation link generated');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Could not create invitation';
      setErr(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Invitation link copied');
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy invitation link');
    }
  }

  function reset() {
    setEmail(''); setRole('MEMBER'); setLink(null); setErr(null); setCopied(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button><UserPlus className="h-4 w-4" /> Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><UserPlus className="h-5 w-5" /> Invite a member</DialogTitle>
          <DialogDescription>Generate a secure, email-bound link that expires after 72 hours.</DialogDescription>
        </DialogHeader>
        {!link ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Workspace role</Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'MEMBER' | 'ADMIN')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="MEMBER">Member</SelectItem>
                  {actorRole === 'OWNER' ? <SelectItem value="ADMIN">Admin</SelectItem> : null}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Owners must promote members explicitly after they join.
              </p>
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="submit" disabled={busy || !email}>
                <Link2 className="h-4 w-4" /> {busy ? 'Generating…' : 'Generate invite link'}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this link with <strong>{email}</strong>. It expires in 72 hours.
            </p>
            <div className="flex gap-2">
              <Input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset}>
                Invite another
              </Button>
              <Button onClick={() => setOpen(false)}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
