'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, CirclePlus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateTask } from '@/hooks/useTasks';
import { toast } from 'sonner';

export function QuickAdd() {
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const createTask = useCreateTask();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t || busy) return;
    setBusy(true);
    try {
      await createTask.mutateAsync({
        title: t,
        status: 'TODO',
        priority: 'MEDIUM',
        isPrivate: false,
      });
      setTitle('');
      toast.success('Task added');
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to add';
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="flex items-center gap-2 rounded-lg border border-border/60 bg-card p-2">
      <Plus className="ml-2 h-4 w-4 text-muted-foreground" aria-hidden />
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Quick add a task — press Enter"
        className="border-0 shadow-none focus-visible:ring-0"
      />
      <Button type="submit" size="sm" disabled={busy || !title.trim()}>
        <CirclePlus className="mr-2 h-4 w-4" />
        Add
      </Button>
    </form>
  );
}
