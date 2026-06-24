import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void } | null;
};

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <div className="rounded-full border border-border/60 bg-muted/40 p-4">
        <Icon className="h-6 w-6 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-1">
        <h3 className="text-base font-medium">{title}</h3>
        {description ? (
          <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? (
        <Button size="sm" onClick={action.onClick}>{action.label}</Button>
      ) : null}
    </div>
  );
}
