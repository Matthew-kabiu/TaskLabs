import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { NotificationBell } from '@/components/notifications/notification-bell';

const markAllRead = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: () => ({
    notifications: [
      { id: 'n1', type: 'TASK_ASSIGNED', payload: { taskId: 't_1', title: 'Hi' }, readAt: null, createdAt: new Date().toISOString() },
    ],
    unreadCount: 1,
    isLoading: false,
    markRead: vi.fn(),
    markAllRead,
  }),
}));

// Mock DropdownMenu to avoid Radix portal rendering issues in jsdom
vi.mock('@/components/ui/dropdown-menu', () => {
  const React = require('react');
  return {
    DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
    DropdownMenuTrigger: ({ children, asChild: _asChild }: { children: React.ReactNode; asChild?: boolean }) =>
      React.createElement('div', { 'data-testid': 'trigger' }, children),
    DropdownMenuContent: ({ children }: { children: React.ReactNode }) =>
      React.createElement('div', { 'data-testid': 'content' }, children),
  };
});

describe('NotificationBell', () => {
  it('shows unread badge', () => {
    render(<NotificationBell />);
    expect(screen.getByLabelText(/notifications/i)).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('triggers markAllRead', async () => {
    render(<NotificationBell />);
    // With mocked DropdownMenu the content is always visible
    const btn = await screen.findByRole('button', { name: /mark all read/i });
    fireEvent.click(btn);
    await waitFor(() => expect(markAllRead).toHaveBeenCalled());
  });
});
