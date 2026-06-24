import { Skeleton } from '@/components/ui/skeleton';

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-4" aria-busy="true">
      {['Todo', 'In Progress', 'Done', 'Archived'].map((col) => (
        <div key={col} className="rounded-lg border border-border/60 p-3">
          <Skeleton className="mb-3 h-4 w-20" />
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-md" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
