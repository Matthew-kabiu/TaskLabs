'use client';

import * as React from 'react';
import { useMutation } from 'convex/react';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover, PopoverTrigger, PopoverContent,
} from '@/components/ui/popover';
import {
  Command, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator,
  CommandEmpty,
} from '@/components/ui/command';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useActiveWorkspaceStore } from '@/lib/stores/active-workspace';
import { BACKEND_ROUTES } from '@/lib/routes';

export type SwitcherWorkspace = {
  id: string;
  name: string;
  isPersonal: boolean;
};

export function WorkspaceSwitcher(props: {
  workspaces: SwitcherWorkspace[];
  activeId: string;
}) {
  const setActiveWorkspaceId = useActiveWorkspaceStore((s) => s.setActiveWorkspaceId);
  const createWorkspace = useMutation(BACKEND_ROUTES.workspaces.create);
  const [open, setOpen] = React.useState(false);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [name, setName] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  const active = props.workspaces.find((w) => w.id === props.activeId)
    ?? props.workspaces[0];

  async function pick(id: string) {
    setOpen(false);
    if (id === active?.id) return;
    setActiveWorkspaceId(id);
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      const data = await createWorkspace({ name });
      if (data?.id) setActiveWorkspaceId(data.id);
      setCreateOpen(false);
      setName('');
    } catch (err: unknown) {
      setErr(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{active?.name ?? 'Select workspace'}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[240px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search workspaces…" />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Your workspaces">
                {props.workspaces.map((w) => (
                  <CommandItem
                    key={w.id}
                    value={w.name}
                    onSelect={() => pick(w.id)}
                  >
                    <Check
                      className={`mr-2 h-4 w-4 ${w.id === active?.id ? 'opacity-100' : 'opacity-0'}`}
                    />
                    <span className="truncate">{w.name}</span>
                    {w.isPersonal && (
                      <span className="ml-auto text-xs text-muted-foreground">
                        personal
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => { setOpen(false); setCreateOpen(true); }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create workspace
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
          </DialogHeader>
          <form onSubmit={onCreate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ws-name">Name</Label>
              <Input
                id="ws-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            {err && <p className="text-sm text-destructive">{err}</p>}
            <DialogFooter>
              <Button type="submit" disabled={busy || !name}>
                {busy ? 'Creating…' : 'Create'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
