'use client';
import * as React from 'react';
import { Calendar } from '@/components/ui/calendar';

interface Props {
  selected: Date;
  onSelect: (d: Date) => void;
}

export function MiniCalendar({ selected, onSelect }: Props) {
  return (
    <Calendar
      mode="single"
      weekStartsOn={1}
      selected={selected}
      onSelect={(d) => d && onSelect(d)}
      showOutsideDays
      className="w-full"
    />
  );
}
