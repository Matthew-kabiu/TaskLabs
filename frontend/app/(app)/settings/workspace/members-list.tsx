'use client';

import { useState } from 'react';
import { useMutation } from 'convex/react';
import type { Id } from '@convex/_generated/dataModel';
import { LogOut, ShieldCheck, Trash2, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BACKEND_ROUTES } from '@/lib/routes';
import type { WorkspaceRole } from '@/hooks/useWorkspaces';
import { formatDateTime } from '@/lib/datetime';
import { cn } from '@/lib/utils';

type Member = {
  id: string;
  email: string;
  name: string | null;
  role: WorkspaceRole;
  joinedAt: string;
};

const ROLE_RANK: Record<WorkspaceRole, number> = { MEMBER: 1, ADMIN: 2, OWNER: 3 };

function initials(member: Member) {
  const value = member.name?.trim() || member.email || '?';
  const parts = value.split(/\s+/);
  return (parts.length > 1 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}

export function MembersList(props: {
  workspaceId: string;
  currentUserId: string;
  actorRole: WorkspaceRole;
  isPersonal: boolean;
  members: Member[];
}) {
  const removeMember = useMutation(BACKEND_ROUTES.workspaces.removeMember);
  const updateRole = useMutation(BACKEND_ROUTES.workspaces.updateMemberRole);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<Member | null>(null);
  const ownerCount = props.members.filter((member) => member.role === 'OWNER').length;

  const canRemove = (member: Member) => {
    if (props.isPersonal) return false;
    if (member.id === props.currentUserId) {
      return props.members.length > 1 && !(member.role === 'OWNER' && ownerCount === 1);
    }
    return (
      ROLE_RANK[props.actorRole] >= ROLE_RANK.ADMIN &&
      ROLE_RANK[props.actorRole] > ROLE_RANK[member.role]
    );
  };

  async function remove(member: Member) {
    setBusyId(member.id);
    try {
      await removeMember({
        workspaceId: props.workspaceId as Id<'workspaces'>,
        userId: member.id as Id<'users'>,
      });
      toast.success(member.id === props.currentUserId ? 'You left the workspace' : 'Member removed');
      setConfirmTarget(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove member');
    } finally {
      setBusyId(null);
    }
  }

  async function changeRole(member: Member, role: WorkspaceRole) {
    setBusyId(member.id);
    try {
      await updateRole({
        workspaceId: props.workspaceId as Id<'workspaces'>,
        userId: member.id as Id<'users'>,
        role,
      });
      toast.success(`${member.name ?? member.email} is now ${role.toLowerCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update role');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <ul className="divide-y rounded-xl border border-border/60 bg-card/30">
        {props.members.map((member) => {
          const isCurrent = member.id === props.currentUserId;
          const canEditRole =
            !props.isPersonal &&
            props.actorRole === 'OWNER' &&
            (!isCurrent || member.role !== 'OWNER' || ownerCount > 1);
          return (
            <li key={member.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold ring-1 ring-border">
                {initials(member)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium">{member.name ?? member.email}</p>
                  {isCurrent ? <Badge variant="outline">You</Badge> : null}
                </div>
                <p className="truncate text-xs text-muted-foreground">{member.email}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                  Joined {formatDateTime(member.joinedAt, 'date')}
                </p>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                {canEditRole ? (
                  <Select
                    value={member.role}
                    onValueChange={(role) => changeRole(member, role as WorkspaceRole)}
                    disabled={busyId === member.id}
                  >
                    <SelectTrigger className="w-32">
                      <ShieldCheck className="mr-1.5 h-3.5 w-3.5 text-muted-foreground" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Member</SelectItem>
                      <SelectItem value="ADMIN">Admin</SelectItem>
                      <SelectItem value="OWNER">Owner</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge
                    variant="secondary"
                    className={cn(member.role === 'OWNER' && 'text-amber-500')}
                  >
                    {member.role.charAt(0) + member.role.slice(1).toLowerCase()}
                  </Badge>
                )}
                {canRemove(member) ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => setConfirmTarget(member)}
                  >
                    {isCurrent ? <LogOut className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                    {isCurrent ? 'Leave' : 'Remove'}
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>

      <Dialog open={confirmTarget !== null} onOpenChange={(open) => !open && setConfirmTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserRound className="h-5 w-5" />
              {confirmTarget?.id === props.currentUserId ? 'Leave workspace?' : 'Remove member?'}
            </DialogTitle>
            <DialogDescription>
              {confirmTarget?.id === props.currentUserId
                ? 'You will lose access to this workspace and its projects, tasks, and calendar.'
                : `${confirmTarget?.name ?? confirmTarget?.email} will lose access to this workspace.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              disabled={!confirmTarget || busyId === confirmTarget.id}
              onClick={() => confirmTarget && remove(confirmTarget)}
            >
              {confirmTarget?.id === props.currentUserId ? 'Leave workspace' : 'Remove member'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
