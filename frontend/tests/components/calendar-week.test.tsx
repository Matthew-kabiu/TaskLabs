import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { CalendarWeek } from '@/components/calendar/calendar-week';

describe('CalendarWeek', () => {
  it('renders 24 hour rows and 7 day columns', () => {
    const { container } = render(
      <CalendarWeek
        cursor={new Date('2026-05-06T00:00:00.000Z')}
        events={[]}
        tasks={[]}
        onSelectEvent={() => {}}
        onSelectTask={() => {}}
      />,
    );
    expect(container.querySelectorAll('[data-hour-row]')).toHaveLength(24);
    expect(container.querySelectorAll('[data-day-col]')).toHaveLength(7);
  });
});
