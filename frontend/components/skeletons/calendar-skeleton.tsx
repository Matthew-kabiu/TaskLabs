import { Skeleton } from '@/components/ui/skeleton';

export function CalendarSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="grid grid-cols-7 gap-px rounded-lg border border-border/60 bg-border/40">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="aspect-square bg-background p-2">
            <Skeleton className="h-3 w-6" />
          </div>
        ))}
      </div>
    </div>
  );
}
