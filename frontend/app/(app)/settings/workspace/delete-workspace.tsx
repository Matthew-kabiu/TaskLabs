'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { BACKEND_ROUTES } from '@/lib/routes';

export function DeleteWorkspace({ workspaceId, name }: { workspaceId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const removeWorkspace = useMutation(BACKEND_ROUTES.workspaces.remove);

  async function remove() {
    setBusy(true);
    try {
      await removeWorkspace({ workspaceId: workspaceId as Id<'workspaces'> });
      toast.success('Workspace deleted');
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not delete workspace');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive"><Trash2 className="h-4 w-4" /> Delete workspace</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Delete {name}?</DialogTitle>
          <DialogDescription>
            This permanently deletes the workspace and its related data. This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" disabled={busy} onClick={remove}>
            {busy ? 'Deleting…' : 'Delete workspace'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
