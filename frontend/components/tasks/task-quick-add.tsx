'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { parseQuickAdd, type QuickAddResult } from '@/lib/tasks/quick-parse';

interface Props {
  onCreate: (parsed: QuickAddResult) => void;
  now?: Date;
}

export function TaskQuickAdd({ onCreate, now }: Props) {
  const [value, setValue] = useState('');

  const submit = () => {
    const parsed = parseQuickAdd(value, now);
    if (!parsed.title) return;
    onCreate(parsed);
    setValue('');
  };

  return (
    <Input
      placeholder='Quick add — e.g. "Buy groceries !high tomorrow"'
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        }
      }}
    />
  );
}
