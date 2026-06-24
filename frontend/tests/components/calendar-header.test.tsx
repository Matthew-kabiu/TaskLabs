import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CalendarHeader } from '@/components/calendar/calendar-header';

describe('CalendarHeader', () => {
  it('renders the current range label', () => {
    render(
      <CalendarHeader
        view="month"
        cursor={new Date('2026-05-15T00:00:00.000Z')}
        onViewChange={() => {}}
        onNavigate={() => {}}
        onToday={() => {}}
      />,
    );
    expect(screen.getByText(/May 2026/)).toBeInTheDocument();
  });

  it('calls onNavigate(prev/next)', () => {
    const onNavigate = vi.fn();
    render(
      <CalendarHeader
        view="month"
        cursor={new Date('2026-05-15T00:00:00.000Z')}
        onViewChange={() => {}}
        onNavigate={onNavigate}
        onToday={() => {}}
      />,
    );
    screen.getByLabelText('Previous').click();
    screen.getByLabelText('Next').click();
    expect(onNavigate).toHaveBeenCalledWith('prev');
    expect(onNavigate).toHaveBeenCalledWith('next');
  });
});
