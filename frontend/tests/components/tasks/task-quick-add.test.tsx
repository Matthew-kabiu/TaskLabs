import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskQuickAdd } from '@/components/tasks/task-quick-add';

describe('TaskQuickAdd', () => {
  it('parses input and calls onCreate with structured payload', () => {
    const onCreate = vi.fn();
    render(<TaskQuickAdd onCreate={onCreate} now={new Date('2026-04-28T12:00:00Z')} />);
    const input = screen.getByPlaceholderText(/quick add/i);
    fireEvent.change(input, { target: { value: 'Buy groceries !high tomorrow' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Buy groceries',
        priority: 'HIGH',
      }),
    );
    expect((onCreate.mock.calls[0][0] as any).dueDate).toBeInstanceOf(Date);
  });

  it('does nothing on empty input', () => {
    const onCreate = vi.fn();
    render(<TaskQuickAdd onCreate={onCreate} />);
    fireEvent.keyDown(screen.getByPlaceholderText(/quick add/i), { key: 'Enter' });
    expect(onCreate).not.toHaveBeenCalled();
  });
});
