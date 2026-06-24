import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EventChip } from '@/components/calendar/event-chip';

describe('EventChip', () => {
  it('renders solid variant for events', () => {
    render(
      <EventChip variant="event" colorId="blue" title="Standup" />,
    );
    const el = screen.getByText('Standup');
    expect(el.parentElement?.getAttribute('data-variant')).toBe('event');
  });

  it('renders outlined variant for tasks', () => {
    render(<EventChip variant="task" title="Ship MVP" />);
    const el = screen.getByText('Ship MVP');
    expect(el.parentElement?.getAttribute('data-variant')).toBe('task');
  });

  it('passes onClick through', () => {
    let clicked = false;
    render(
      <EventChip
        variant="event"
        title="t"
        onClick={() => {
          clicked = true;
        }}
      />,
    );
    screen.getByRole('button').click();
    expect(clicked).toBe(true);
  });
});
