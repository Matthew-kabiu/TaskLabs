'use client';

import { useState } from 'react';
import { Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  count?: number;
  taskTitle?: string;
  onConfirm: () => Promise<void>;
}

export function TaskDeleteDialog({
  open,
  onOpenChange,
  count = 1,
  taskTitle,
  onConfirm,
}: Props) {
  const [deleting, setDeleting] = useState(false);
  const plural = count !== 1;

  async function handleConfirm() {
    setDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // The caller owns user-facing error reporting; keep the dialog open.
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent className="max-w-md gap-5 sm:rounded-md">
        <DialogHeader className="gap-3">
          <div className="grid size-10 place-items-center rounded-md border border-destructive/30 bg-destructive/10 text-destructive">
            <Trash2 className="size-5" aria-hidden />
          </div>
          <div className="space-y-2">
            <DialogTitle>Delete {plural ? `${count} tasks` : 'task'}?</DialogTitle>
            <DialogDescription className="leading-6">
              {taskTitle ? (
                <>
                  This permanently deletes <strong className="font-medium text-foreground">“{taskTitle}”</strong>{' '}
                  and its task metadata.
                </>
              ) : (
                <>This permanently deletes the {count} selected tasks and their task metadata.</>
              )}{' '}
              This action cannot be undone.
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:space-x-0">
          <Button
            type="button"
            variant="outline"
            disabled={deleting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={handleConfirm}
          >
            {deleting ? <Loader2 className="animate-spin" aria-hidden /> : <Trash2 aria-hidden />}
            {deleting ? 'Deleting…' : `Delete ${plural ? 'tasks' : 'task'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
