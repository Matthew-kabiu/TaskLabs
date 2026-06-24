'use client';
import Link from 'next/link';
import { ListChecks } from 'lucide-react';
import { ROUTES } from '@/lib/routes';
import { EmptyState } from '@/components/empty-state';

type Task = { id: string; title: string; priority: string; dueDate: string | null; status: string };

export function TodayTasks({ items }: { items: Task[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border/60 p-4">
        <h3 className="mb-2 text-sm font-medium">Today</h3>
        <EmptyState icon={ListChecks} title="Nothing due today" description="Enjoy the breathing room." action={null} />
      </div>
    );
  }
  return (
    <div className="rounded-lg border border-border/60 p-4">
      <h3 className="mb-3 text-sm font-medium">Today</h3>
      <ul className="space-y-1">
        {items.map(t => (
          <li key={t.id}>
            <Link href={ROUTES.app.task(t.id)} className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-muted/50">
              <span className="truncate text-sm">{t.title}</span>
              <span className="text-xs text-muted-foreground">{t.priority.toLowerCase()}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
