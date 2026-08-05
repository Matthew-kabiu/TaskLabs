import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PendingInvitations } from '@/app/(app)/settings/workspace/pending-invitations';

const state = vi.hoisted(() => ({ role: 'MEMBER' as 'MEMBER' | 'ADMIN' }));

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
  useQuery: () => [
    {
      id: 'invite1',
      email: 'invitee@example.com',
      role: state.role,
      createdAt: '2026-08-01T00:00:00.000Z',
      expiresAt: '2026-08-04T00:00:00.000Z',
    },
  ],
}));

describe('PendingInvitations permissions', () => {
  it('allows an owner to resend and revoke an invitation', () => {
    state.role = 'ADMIN';
    render(<PendingInvitations workspaceId="ws1" actorRole="OWNER" />);

    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /revoke/i })).toBeInTheDocument();
  });

  it('does not let an admin manage an owner-created admin invitation', () => {
    state.role = 'ADMIN';
    render(<PendingInvitations workspaceId="ws1" actorRole="ADMIN" />);

    expect(screen.queryByRole('button', { name: /resend|revoke/i })).not.toBeInTheDocument();
  });
});
