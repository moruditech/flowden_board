import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { organizationApi } from '../../../api/organization.api.js';
import { queryClient } from '../../../lib/queryClient.js';
import { useUiStore } from '../../../store/uiStore.js';

// ── Organizations ─────────────────────────────────────────────────────────────

export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn:  () => organizationApi.list().then((r) => r.data.data.orgs),
  });
}

export function useOrganization(orgId) {
  return useQuery({
    queryKey: ['organizations', orgId],
    queryFn:  () => organizationApi.getById(orgId).then((r) => r.data.data.org),
    enabled:  !!orgId,
  });
}

export function useCreateOrganization() {
  const { setActiveOrg } = useUiStore();
  return useMutation({
    mutationFn: (data) => organizationApi.create(data).then((r) => r.data.data.org),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setActiveOrg(org.id);
      localStorage.setItem('activeOrgId', org.id);
      toast.success(`"${org.name}" created`);
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to create organization'),
  });
}

export function useUpdateOrganization(orgId) {
  return useMutation({
    mutationFn: (data) => organizationApi.update(orgId, data).then((r) => r.data.data.org),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations', orgId] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      toast.success('Organization updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Update failed'),
  });
}

export function useDeleteOrganization() {
  const { setActiveOrg } = useUiStore();
  return useMutation({
    mutationFn: (orgId) => organizationApi.remove(orgId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      setActiveOrg(null);
      localStorage.removeItem('activeOrgId');
      toast.success('Organization deleted');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Delete failed'),
  });
}

// ── Members ───────────────────────────────────────────────────────────────────

export function useMembers(orgId) {
  return useQuery({
    queryKey: ['members', orgId],
    queryFn:  () => organizationApi.listMembers(orgId).then((r) => r.data.data.members),
    enabled:  !!orgId,
  });
}

export function useUpdateMemberRole(orgId) {
  return useMutation({
    mutationFn: ({ userId, role }) => organizationApi.updateMemberRole(orgId, userId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to update role'),
  });
}

export function useRemoveMember(orgId) {
  return useMutation({
    mutationFn: (userId) => organizationApi.removeMember(orgId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', orgId] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(err.response?.data?.error?.message || 'Failed to remove member'),
  });
}
