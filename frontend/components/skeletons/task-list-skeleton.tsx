import { Skeleton } from '@/components/ui/skeleton';

export function TaskListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-md border border-border/60 px-4 py-3">
          <Skeleton className="h-4 w-4 rounded-sm" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-4 w-16" />
        </div>
      ))}
    </div>
  );
}
