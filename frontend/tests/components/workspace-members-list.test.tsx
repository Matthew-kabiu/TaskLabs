import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MembersList } from '@/app/(app)/settings/workspace/members-list';

vi.mock('convex/react', () => ({
  useMutation: () => vi.fn(),
}));

const members = [
  {
    id: 'owner',
    email: 'owner@example.com',
    name: 'Workspace Owner',
    role: 'OWNER' as const,
    joinedAt: '2026-08-01T00:00:00.000Z',
  },
  {
    id: 'member',
    email: 'member@example.com',
    name: 'Team Member',
    role: 'MEMBER' as const,
    joinedAt: '2026-08-02T00:00:00.000Z',
  },
];

describe('MembersList permissions', () => {
  it('lets an owner change lower roles and remove lower-role members', () => {
    render(
      <MembersList
        workspaceId="ws1"
        currentUserId="owner"
        actorRole="OWNER"
        isPersonal={false}
        members={members}
      />,
    );

    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove/i })).toBeInTheDocument();
  });

  it('keeps role and removal controls hidden from ordinary members', () => {
    render(
      <MembersList
        workspaceId="ws1"
        currentUserId="member"
        actorRole="MEMBER"
        isPersonal={false}
        members={members}
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /leave/i })).toBeInTheDocument();
  });

  it('does not allow membership changes in a personal workspace', () => {
    render(
      <MembersList
        workspaceId="ws1"
        currentUserId="owner"
        actorRole="OWNER"
        isPersonal
        members={[members[0]]}
      />,
    );

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /leave|remove/i })).not.toBeInTheDocument();
  });
});
