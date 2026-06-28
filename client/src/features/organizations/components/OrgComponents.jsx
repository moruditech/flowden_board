import { useState } from 'react';
import { Modal, ModalFooter } from '../../../components/ui/Modal.jsx';
import { Input, Select } from '../../../components/ui/Input.jsx';
import { Button } from '../../../components/ui/Button.jsx';
import { Avatar } from '../../../components/ui/Avatar.jsx';
import { RoleBadge } from '../../../components/ui/Badge.jsx';
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog.jsx';
import { useCreateOrganization, useUpdateMemberRole, useRemoveMember } from '../hooks/useOrganizations.js';
import { inviteApi } from '../../../api/invite.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import toast from 'react-hot-toast';

// ── CreateOrgModal ────────────────────────────────────────────────────────────
export function CreateOrgModal({ open, onClose }) {
  const create = useCreateOrganization();
  const [form, setForm] = useState({ name: '', slug: '', description: '' });

  const set = (k) => (e) => {
    const val = e.target.value;
    setForm((f) => ({
      ...f,
      [k]: val,
      ...(k === 'name' ? { slug: val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') } : {}),
    }));
  };

  function handleSubmit(e) {
    e.preventDefault();
    create.mutate(form, { onSuccess: onClose });
  }

  return (
    <Modal open={open} onClose={onClose} title="Create organization" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Organization name" required value={form.name} onChange={set('name')}
          placeholder="Acme Corp" />
        <Input label="Slug" required value={form.slug} onChange={set('slug')}
          placeholder="acme-corp"
          helper="Used in URLs — lowercase letters, numbers, and hyphens only" />
        <Input label="Description" value={form.description} onChange={set('description')}
          placeholder="What does your org work on?" />
        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" loading={create.isPending}>Create</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ── InviteModal ───────────────────────────────────────────────────────────────
export function InviteModal({ open, onClose, orgId }) {
  const [form, setForm] = useState({ email: '', role: 'member' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await inviteApi.create(orgId, form);
      queryClient.invalidateQueries({ queryKey: ['invites', orgId] });
      toast.success(`Invite sent to ${form.email}`);
      setForm({ email: '', role: 'member' });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error?.message || 'Failed to send invite');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Invite a team member" size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Email address" type="email" required value={form.email}
          onChange={set('email')} placeholder="colleague@company.com" />
        <Select label="Role" value={form.role} onChange={set('role')}>
          <option value="member">Member — can view boards and manage tasks</option>
          <option value="admin">Admin — can also create boards and invite members</option>
        </Select>
        <ModalFooter>
          <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button size="sm" type="submit" loading={loading}>Send invite</Button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

// ── MemberCard ────────────────────────────────────────────────────────────────
export function MemberCard({ member, orgId, currentUserId, currentRole }) {
  const updateRole = useUpdateMemberRole(orgId);
  const remove     = useRemoveMember(orgId);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const user      = member.user || member;
  const userId    = user._id || user.id;
  const isSelf    = userId === currentUserId;
  const isOwner   = member.role === 'owner';
  const canManage = (currentRole === 'owner' || currentRole === 'admin') && !isSelf && !isOwner;

  return (
    <div className="flex items-center gap-3 py-3 border-b border-zinc-100 last:border-0">
      <Avatar name={user.name} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-900 truncate">{user.name}</p>
          {isSelf && <span className="text-2xs text-zinc-400">(you)</span>}
        </div>
        <p className="text-xs text-zinc-500 truncate">{user.email}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {canManage && currentRole === 'owner' ? (
          <select
            value={member.role}
            onChange={(e) => updateRole.mutate({ userId, role: e.target.value })}
            className="text-xs border border-zinc-200 rounded px-2 py-1 text-zinc-700 bg-white focus:outline-none focus:border-brand-600"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}

        {canManage && (
          <button
            onClick={() => setConfirmRemove(true)}
            className="w-7 h-7 flex items-center justify-center rounded text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Remove member"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
            </svg>
          </button>
        )}
      </div>

      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate(userId, { onSuccess: () => setConfirmRemove(false) })}
        title="Remove member"
        description={`Remove ${user.name} from this organization? They will lose access to all boards immediately.`}
        confirmLabel="Remove"
        danger
        loading={remove.isPending}
      />
    </div>
  );
}
