import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { inviteApi } from '../../api/invite.api.js';
import { useAuthStore } from '../../store/authStore.js';
import { useUiStore } from '../../store/uiStore.js';
import { queryClient } from '../../lib/queryClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { Spinner } from '../../components/ui/Spinner.jsx';

export default function InviteAcceptPage() {
  const [params]         = useSearchParams();
  const navigate         = useNavigate();
  const { user }         = useAuthStore();
  const { setActiveOrg } = useUiStore();
  const token            = params.get('token') || '';
  const [status, setStatus] = useState('idle'); // idle | accepting | success | error
  const [errorMsg, setErrorMsg] = useState('');

  const acceptMutation = useMutation({
    mutationFn: () => inviteApi.accept({ token }).then((r) => r.data.data),
    onSuccess: (data) => {
      setStatus('success');
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
      const orgId = data.org?.id || data.org?._id;
      if (orgId) {
        setActiveOrg(orgId);
        localStorage.setItem('activeOrgId', orgId);
      }
    },
    onError: (err) => {
      setStatus('error');
      setErrorMsg(err.response?.data?.error?.message || 'Failed to accept invitation');
    },
  });

  useEffect(() => {
    if (!token) { setStatus('error'); setErrorMsg('Missing invite token'); }
  }, [token]);

  function handleAccept() {
    setStatus('accepting');
    acceptMutation.mutate();
  }

  // ── Layout wrapper (same style as auth pages) ──────────────────────────────
  function Shell({ title, subtitle, children }) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col">
        <div className="h-1 bg-brand-600 shrink-0" />
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <div className="w-full max-w-sm">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-8 h-8 rounded bg-brand-600 flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">TW</span>
              </div>
              <span className="text-zinc-900 text-sm font-semibold tracking-tight">Team Workspace</span>
            </div>
            <h1 className="text-xl font-semibold text-zinc-900 mb-1">{title}</h1>
            {subtitle && <p className="text-sm text-zinc-500 mb-6">{subtitle}</p>}
            {children}
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (status === 'success') {
    const orgName = acceptMutation.data?.org?.name;
    return (
      <Shell title="Invitation accepted" subtitle={orgName ? `You've joined ${orgName}.` : 'You\'ve joined the organization.'}>
        <div className="p-4 bg-brand-50 border border-brand-200 rounded text-sm text-brand-800 mb-6">
          You now have access to all boards and tasks in this workspace.
        </div>
        <Button className="w-full" onClick={() => navigate('/')}>
          Go to workspace
        </Button>
      </Shell>
    );
  }

  // Error state
  if (status === 'error') {
    return (
      <Shell title="Invitation error" subtitle="There was a problem with this invitation link.">
        <div className="p-4 bg-red-50 border border-red-200 rounded text-sm text-red-700 mb-6">
          {errorMsg}
        </div>
        <div className="space-y-2">
          {user
            ? <Button variant="secondary" className="w-full" onClick={() => navigate('/')}>Back to workspace</Button>
            : <Link to="/login"><Button variant="secondary" className="w-full">Sign in</Button></Link>
          }
        </div>
      </Shell>
    );
  }

  // Not logged in — prompt to sign in first
  if (!user) {
    return (
      <Shell title="You've been invited" subtitle="Sign in to accept the invitation and join the team.">
        <div className="p-4 bg-zinc-100 rounded text-sm text-zinc-700 mb-6">
          You need an account to accept this invitation.
        </div>
        <div className="space-y-2">
          <Link to={`/login?redirect=/invites/accept?token=${token}`}>
            <Button className="w-full">Sign in to accept</Button>
          </Link>
          <Link to={`/register?redirect=/invites/accept?token=${token}`}>
            <Button variant="secondary" className="w-full">Create an account</Button>
          </Link>
        </div>
      </Shell>
    );
  }

  // Ready to accept
  return (
    <Shell title="You've been invited" subtitle="Accept the invitation to join this team workspace.">
      <div className="p-4 bg-white border border-zinc-200 rounded text-sm mb-6">
        <p className="text-zinc-600">Signed in as <span className="font-medium text-zinc-900">{user.email}</span></p>
      </div>
      <Button
        className="w-full"
        onClick={handleAccept}
        loading={status === 'accepting'}
      >
        Accept invitation
      </Button>
      <p className="mt-4 text-center text-xs text-zinc-500">
        Not you?{' '}
        <Link to="/login" className="text-brand-700 hover:underline">Sign in with a different account</Link>
      </p>
    </Shell>
  );
}
