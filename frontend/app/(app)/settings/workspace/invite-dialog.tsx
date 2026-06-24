// app/(app)/settings/workspace/invite-dialog.tsx
'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';

export function InviteDialog({ workspaceId }: { workspaceId: string }) {
  const createInvitation = useMutation(BACKEND_ROUTES.invitations.create);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
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
      })) as { token: string; invitePath?: string };
      const path = data.invitePath ?? ROUTES.app.invite(data.token);
      setLink(`${window.location.origin}${path}`);
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function reset() {
    setEmail(''); setLink(null); setErr(null); setCopied(false);
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        <Button>Invite member</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite a member</DialogTitle>
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
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="submit" disabled={busy || !email}>
                {busy ? 'Generating…' : 'Generate invite link'}
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
