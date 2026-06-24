'use client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { Calendar, ListChecks, Search, Settings, LayoutDashboard } from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';
import { useWorkspaces } from '@/hooks/useWorkspaces';

type SearchHit = {
  tasks: { id: string; title: string }[];
  events: { id: string; title: string }[];
  labels?: { id: string; name: string }[];
};

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [, startTransition] = useTransition();
  const router = useRouter();
  const { activeWorkspaceId } = useWorkspaces();

  useEffect(() => {
    function down(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(open ? q.trim() : '');
    }, 150);
    return () => clearTimeout(t);
  }, [q, open]);

  const results = (useQuery(
    BACKEND_ROUTES.search.workspace,
    activeWorkspaceId && debouncedQ.length > 0
      ? {
          workspaceId: activeWorkspaceId as Id<'workspaces'>,
          q: debouncedQ,
          limit: 8,
        }
      : 'skip',
  ) as SearchHit | undefined) ?? { tasks: [], events: [] };

  function go(path: string) {
    setOpen(false);
    startTransition(() => router.push(path));
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search tasks, events, or jump to a page..." value={q} onValueChange={setQ} />
      <CommandList>
        <CommandEmpty>No results.</CommandEmpty>

        <CommandGroup heading="Navigate">
          <CommandItem onSelect={() => go(ROUTES.app.home)}>
            <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
          </CommandItem>
          <CommandItem onSelect={() => go(ROUTES.app.tasks)}>
            <ListChecks className="mr-2 h-4 w-4" /> Tasks
          </CommandItem>
          <CommandItem onSelect={() => go(ROUTES.app.calendar)}>
            <Calendar className="mr-2 h-4 w-4" /> Calendar
          </CommandItem>
          <CommandItem onSelect={() => go(ROUTES.app.settings.profile)}>
            <Settings className="mr-2 h-4 w-4" /> Settings
          </CommandItem>
        </CommandGroup>

        {results.tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Tasks">
              {results.tasks.map(t => (
                <CommandItem key={t.id} onSelect={() => go(ROUTES.app.task(t.id))}>
                  <Search className="mr-2 h-4 w-4" /> {t.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.events.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Events">
              {results.events.map(e => (
                <CommandItem key={e.id} onSelect={() => go(`${ROUTES.app.calendar}?event=${e.id}`)}>
                  <Calendar className="mr-2 h-4 w-4" /> {e.title}
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
