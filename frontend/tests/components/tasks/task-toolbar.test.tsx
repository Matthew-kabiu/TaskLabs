import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TaskToolbar } from '@/components/tasks/task-toolbar';

describe('TaskToolbar', () => {
  it('emits filter changes', () => {
    const onChange = vi.fn();
    render(
      <TaskToolbar
        filters={{ sort: 'manual' }}
        onFiltersChange={onChange}
        onNewTask={() => {}}
      />,
    );
    const input = screen.getByPlaceholderText(/search/i);
    fireEvent.change(input, { target: { value: 'milk' } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ q: 'milk' }));
  });

  it('emits new task click', () => {
    const fn = vi.fn();
    render(
      <TaskToolbar filters={{ sort: 'manual' }} onFiltersChange={() => {}} onNewTask={fn} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /new task/i }));
    expect(fn).toHaveBeenCalled();
  });
});
