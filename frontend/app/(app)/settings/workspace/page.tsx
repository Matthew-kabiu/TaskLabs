'use client';

import { useQuery } from 'convex/react';
import { Crown, Settings2, ShieldCheck, UserPlus, Users } from 'lucide-react';
import { BACKEND_ROUTES } from '@/lib/routes';
import { useWorkspaceMembers, useWorkspaces } from '@/hooks/useWorkspaces';
import { Badge } from '@/components/ui/badge';
import { RenameForm } from './rename-form';
import { MembersList } from './members-list';
import { InviteDialog } from './invite-dialog';
import { PendingInvitations } from './pending-invitations';
import { DeleteWorkspace } from './delete-workspace';

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

  const canAdminister = workspace.role === 'ADMIN' || workspace.role === 'OWNER';
  const canManageRoles = workspace.role === 'OWNER';
  const canInvite = canAdminister && !workspace.isPersonal;

  return (
    <div className="w-full space-y-8 p-6">
      <header className="flex flex-col gap-3 border-b border-border/50 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
        <h1 className="text-2xl font-semibold">Workspace settings</h1>
        <p className="text-sm text-muted-foreground">
          Manage workspace identity, membership, roles, and access.
        </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">{workspace.isPersonal ? 'Personal workspace' : 'Team workspace'}</Badge>
          <Badge variant="secondary">Your role: {workspace.role.toLowerCase()}</Badge>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:items-start">
        <div className="space-y-6">
        <section className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">General</h2>
          </div>
          <RenameForm
            workspaceId={workspace.id}
            initialName={workspace.name}
            isPersonal={workspace.isPersonal}
            canEdit={canAdminister}
          />
        </section>

        <section className="space-y-4 rounded-xl border border-border/60 bg-card/30 p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-medium">Permissions</h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex gap-3"><Users className="mt-0.5 h-4 w-4 text-muted-foreground" /><div><p className="font-medium">Member</p><p className="text-xs text-muted-foreground">Access workspace tasks, projects, calendar, and member directory.</p></div></div>
            <div className="flex gap-3"><ShieldCheck className="mt-0.5 h-4 w-4 text-sky-400" /><div><p className="font-medium">Admin</p><p className="text-xs text-muted-foreground">Rename workspace, invite members, and remove members below their role.</p></div></div>
            <div className="flex gap-3"><Crown className="mt-0.5 h-4 w-4 text-amber-400" /><div><p className="font-medium">Owner</p><p className="text-xs text-muted-foreground">Manage roles and delete non-personal workspaces.</p></div></div>
          </div>
          {!canManageRoles ? <p className="text-xs text-muted-foreground">Only owners can change member roles.</p> : null}
        </section>
        </div>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-medium">Members</h2>
              <p className="text-sm text-muted-foreground">{members.length} workspace member{members.length === 1 ? '' : 's'}</p>
            </div>
            {canInvite ? <InviteDialog workspaceId={workspace.id} actorRole={workspace.role} /> : null}
          </div>
          <MembersList
            workspaceId={workspace.id}
            currentUserId={profile.id}
            actorRole={workspace.role}
            isPersonal={workspace.isPersonal}
            members={members.map((m) => ({
              id: m.userId,
              email: m.email ?? '',
              name: m.name,
              role: m.role,
              joinedAt: new Date(m.joinedAt).toISOString(),
            }))}
          />
          {workspace.isPersonal ? (
            <p className="text-xs text-muted-foreground">Personal workspace membership is fixed and cannot be removed.</p>
          ) : null}
        </section>
      </div>

      {canInvite ? (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-muted-foreground" />
            <div><h2 className="text-base font-medium">Pending invitations</h2><p className="text-xs text-muted-foreground">Invitation links expire after 72 hours.</p></div>
          </div>
          <PendingInvitations workspaceId={workspace.id} actorRole={workspace.role} />
        </section>
      ) : null}

      {workspace.role === 'OWNER' && !workspace.isPersonal ? (
        <section className="flex flex-col gap-4 rounded-xl border border-destructive/30 bg-destructive/5 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-medium text-destructive">Danger zone</h2><p className="text-sm text-muted-foreground">Permanently delete this workspace and its related data.</p></div>
          <DeleteWorkspace workspaceId={workspace.id} name={workspace.name} />
        </section>
      ) : null}
    </div>
  );
}
