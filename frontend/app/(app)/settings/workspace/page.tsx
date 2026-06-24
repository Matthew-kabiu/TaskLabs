'use client';

import { useQuery } from 'convex/react';
import { BACKEND_ROUTES } from '@/lib/routes';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import { RenameForm } from './rename-form';
import { MembersList } from './members-list';
import { InviteDialog } from './invite-dialog';

type ProfileUser = {
  id: string;
};

export default function WorkspaceSettingsPage() {
  const { activeWorkspace: workspace, activeWorkspaceId, isLoading } = useWorkspaces();
  const { data: members, isLoading: membersLoading } =
    useWorkspaceMembers(activeWorkspaceId);
  const profile = useQuery(BACKEND_ROUTES.profile.get, {}) as
    | ProfileUser
    | undefined;

  if (isLoading || membersLoading || !workspace || !profile) return null;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-10 p-6 md:p-8">
      <header>
        <h1 className="text-2xl font-semibold">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace name, members, and invitations.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2 lg:gap-8 lg:items-start">
        <section className="space-y-4">
          <h2 className="text-lg font-medium">General</h2>
          <RenameForm
            workspaceId={workspace.id}
            initialName={workspace.name}
            isPersonal={workspace.isPersonal}
          />
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Members</h2>
            {!workspace.isPersonal && <InviteDialog workspaceId={workspace.id} />}
          </div>
          <MembersList
            workspaceId={workspace.id}
            currentUserId={profile.id}
            isPersonal={workspace.isPersonal}
            members={members.map((m) => ({
              id: m.userId,
              email: m.email ?? '',
              name: m.name,
              joinedAt: new Date(m.joinedAt).toISOString(),
            }))}
          />
        </section>
      </div>
    </div>
  );
}
