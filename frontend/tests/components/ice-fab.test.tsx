import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { IceFab } from '@/components/ice/ice-fab';

vi.mock('@/components/ice/ice-panel', () => ({
  IcePanel: () => <div>Ice panel stub</div>,
}));

describe('IceFab', () => {
  it('opens the Ice modal from the floating button', () => {
    render(<IceFab />);
    const fab = screen.getByRole('button', { name: 'Open Ice chat' });
    expect(fab).toBeDefined();
    expect(screen.queryByText('Ice panel stub')).toBeNull();
    fireEvent.click(fab);
    expect(screen.getByText('Ice panel stub')).toBeDefined();
  });
});
