'use client';

import { List, Columns } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type TaskView = 'list' | 'kanban';

interface Props {
  value: TaskView;
  onChange: (v: TaskView) => void;
}

export function ViewToggle({ value, onChange }: Props) {
  return (
    <div className="inline-flex rounded-md border bg-background p-0.5">
      <Button
        type="button"
        size="sm"
        variant={value === 'list' ? 'secondary' : 'ghost'}
        onClick={() => onChange('list')}
      >
        <List className="mr-2 h-4 w-4" />
        List
      </Button>
      <Button
        type="button"
        size="sm"
        variant={value === 'kanban' ? 'secondary' : 'ghost'}
        onClick={() => onChange('kanban')}
      >
        <Columns className="mr-2 h-4 w-4" />
        Kanban
      </Button>
    </div>
  );
}
