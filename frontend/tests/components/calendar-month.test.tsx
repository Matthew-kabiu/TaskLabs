import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarMonth } from '@/components/calendar/calendar-month';

describe('CalendarMonth', () => {
  it('renders 42 day cells', () => {
    const { container } = render(
      <CalendarMonth
        cursor={new Date('2026-05-15T00:00:00.000Z')}
        events={[]}
        tasks={[]}
        onSelectDate={() => {}}
        onSelectEvent={() => {}}
        onSelectTask={() => {}}
      />,
    );
    const cells = container.querySelectorAll('[data-day-cell="true"]');
    expect(cells).toHaveLength(42);
  });

  it('renders an event chip on the matching day', () => {
    render(
      <CalendarMonth
        cursor={new Date('2026-05-15T00:00:00.000Z')}
        events={[
          {
            id: 'e1',
            title: 'Hi',
            startAt: '2026-05-15T09:00:00.000Z',
            endAt: '2026-05-15T10:00:00.000Z',
            color: 'blue',
          } as any,
        ]}
        tasks={[]}
        onSelectDate={() => {}}
        onSelectEvent={() => {}}
        onSelectTask={() => {}}
      />,
    );
    expect(screen.getByText('Hi')).toBeInTheDocument();
  });
});
