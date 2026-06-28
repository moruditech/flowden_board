import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { Header } from '../../components/layout/Header.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Avatar } from '../../components/ui/Avatar.jsx';
import { RoleBadge } from '../../components/ui/Badge.jsx';
import { Skeleton, SkeletonText } from '../../components/ui/Skeleton.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog.jsx';
import { CreateOrgModal, InviteModal, MemberCard } from './components/OrgComponents.jsx';
import { useOrganization, useMembers, useRemoveMember } from './hooks/useOrganizations.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { activityApi } from '../../api/activity.api.js';
import { inviteApi } from '../../api/invite.api.js';
import { boardApi } from '../../api/board.api.js';
import { queryClient } from '../../lib/queryClient.js';
import { formatRelative, formatDate } from '../../utils/date.js';
import { cn } from '../../utils/cn.js';

// ── OrgDashboard ──────────────────────────────────────────────────────────────
export default function OrgDashboard() {
  const { orgId }  = useParams();
  const { user }   = useAuthStore();
  const orgQuery   = useOrganization(orgId);
  const membersQ   = useMembers(orgId);
  const activityQ  = useQuery({
    queryKey: ['activity', orgId],
    queryFn:  () => activityApi.listByOrg(orgId, { limit: 5 }).then((r) => r.data.data),
    enabled:  !!orgId,
  });
  const boardsQ = useQuery({
    queryKey: ['boards', orgId],
    queryFn:  () => boardApi.listByOrg(orgId).then((r) => r.data.data.boards),
    enabled:  !!orgId,
  });

  const org = orgQuery.data;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title={org?.name || ''}
        subtitle={org?.description || null}
        actions={
          org?.role !== 'member' && (
            <Link to={`/organizations/${orgId}/invites`}>
              <Button size="sm" variant="secondary">Invite member</Button>
            </Link>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Members', value: membersQ.data?.length ?? '—' },
              { label: 'Boards',  value: boardsQ.data?.length  ?? '—' },
              { label: 'Your role', value: <RoleBadge role={org?.role} /> },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white border border-zinc-200 rounded p-4">
                <p className="text-xs text-zinc-500 mb-1.5">{label}</p>
                <p className="text-xl font-semibold text-zinc-900">{value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-6">
            {/* Recent boards */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Boards</h2>
                <Link to="/boards" className="text-xs text-brand-700 hover:underline">View all</Link>
              </div>
              <div className="space-y-2">
                {boardsQ.isLoading && [1,2,3].map(i => <Skeleton key={i} className="h-11 rounded" />)}
                {boardsQ.data?.slice(0,5).map((b) => (
                  <Link key={b.id} to={`/boards/${b.id}`}
                    className="flex items-center justify-between px-3 py-2.5 bg-white border border-zinc-200 rounded hover:border-zinc-300 hover:bg-zinc-50 transition-colors group">
                    <span className="text-sm font-medium text-zinc-800 truncate">{b.name}</span>
                    <span className="text-xs text-zinc-400 shrink-0 ml-2">{b.columns?.length} cols</span>
                  </Link>
                ))}
                {boardsQ.data?.length === 0 && (
                  <p className="text-xs text-zinc-500 py-4 text-center border border-dashed border-zinc-200 rounded">
                    No boards yet
                  </p>
                )}
              </div>
            </div>

            {/* Recent activity */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">Recent activity</h2>
                <Link to={`/organizations/${orgId}/activity`} className="text-xs text-brand-700 hover:underline">View all</Link>
              </div>
              <div className="space-y-1">
                {activityQ.isLoading && [1,2,3,4].map(i => <Skeleton key={i} className="h-10 rounded" />)}
                {activityQ.data?.items?.map((item) => (
                  <div key={item.id} className="flex items-start gap-2.5 py-2 border-b border-zinc-100 last:border-0">
                    <Avatar name={item.actor?.name} size="xs" className="mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-zinc-700 leading-snug">
                        <span className="font-medium">{item.actor?.name}</span>{' '}
                        <span className="text-zinc-500">{item.action.replace('.', ' ')}</span>
                      </p>
                      <p className="text-2xs text-zinc-400 mt-0.5">{formatRelative(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
                {activityQ.data?.items?.length === 0 && (
                  <p className="text-xs text-zinc-500 py-4 text-center">No activity yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MembersPage ───────────────────────────────────────────────────────────────
export function MembersPage() {
  const { orgId }       = useParams();
  const { user }        = useAuthStore();
  const [showInvite, setShowInvite] = useState(false);
  const orgQuery        = useOrganization(orgId);
  const membersQuery    = useMembers(orgId);
  const currentRole     = orgQuery.data?.role;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Members"
        breadcrumb={orgQuery.data?.name}
        actions={
          currentRole !== 'member' && (
            <Button size="sm" onClick={() => setShowInvite(true)}>Invite member</Button>
          )
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white border border-zinc-200 rounded overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
              <p className="text-xs font-medium text-zinc-500">
                {membersQuery.data?.length ?? 0} member{membersQuery.data?.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="px-4">
              {membersQuery.isLoading
                ? [1,2,3].map(i => <Skeleton key={i} className="h-14 my-2 rounded" />)
                : membersQuery.data?.map((m) => (
                    <MemberCard
                      key={m._id || m.id}
                      member={m}
                      orgId={orgId}
                      currentUserId={user?.id}
                      currentRole={currentRole}
                    />
                  ))
              }
            </div>
          </div>
        </div>
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} orgId={orgId} />
    </div>
  );
}

// ── InvitesPage ───────────────────────────────────────────────────────────────
export function InvitesPage() {
  const { orgId }    = useParams();
  const orgQuery     = useOrganization(orgId);
  const [showInvite, setShowInvite] = useState(false);
  const [revoking, setRevoking]     = useState(null);

  const invitesQuery = useQuery({
    queryKey: ['invites', orgId],
    queryFn:  () => inviteApi.listByOrg(orgId).then((r) => r.data.data.invites),
    enabled:  !!orgId,
  });

  const revokeMutation = useMutation({
    mutationFn: (inviteId) => inviteApi.revoke(orgId, inviteId),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ['invites', orgId] });
      toast.success('Invite revoked');
      setRevoking(null);
    },
    onError: () => toast.error('Failed to revoke invite'),
  });

  const invites = invitesQuery.data || [];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <Header
        title="Pending invitations"
        breadcrumb={orgQuery.data?.name}
        actions={<Button size="sm" onClick={() => setShowInvite(true)}>Invite member</Button>}
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-2xl mx-auto">
          {invitesQuery.isLoading ? (
            <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded" />)}</div>
          ) : invites.length === 0 ? (
            <EmptyState
              title="No pending invitations"
              description="All invites have been accepted or none have been sent yet."
              action={<Button size="sm" onClick={() => setShowInvite(true)}>Send an invite</Button>}
            />
          ) : (
            <div className="bg-white border border-zinc-200 rounded overflow-hidden">
              {invites.map((invite) => (
                <div key={invite.id} className="flex items-center gap-3 px-4 py-3 border-b border-zinc-100 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-800 truncate">{invite.email}</p>
                    <p className="text-xs text-zinc-500">
                      Invited by {invite.invitedBy?.name} · expires {formatDate(invite.expiresAt)}
                    </p>
                  </div>
                  <RoleBadge role={invite.role} />
                  <button
                    onClick={() => setRevoking(invite.id)}
                    className="text-xs text-zinc-400 hover:text-red-600 transition-colors ml-2"
                  >
                    Revoke
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <InviteModal open={showInvite} onClose={() => setShowInvite(false)} orgId={orgId} />

      <ConfirmDialog
        open={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={() => revokeMutation.mutate(revoking)}
        title="Revoke invitation"
        description="The recipient will no longer be able to use this invite link."
        confirmLabel="Revoke"
        danger
        loading={revokeMutation.isPending}
      />
    </div>
  );
}
