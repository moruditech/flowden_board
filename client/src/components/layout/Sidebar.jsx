import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

import { organizationApi } from '../../api/organization.api.js';
import { boardApi }        from '../../api/board.api.js';
import { authApi }         from '../../api/auth.api.js';
import { useAuthStore }    from '../../store/authStore.js';
import { useUiStore }      from '../../store/uiStore.js';
import { queryClient }     from '../../lib/queryClient.js';
import { Avatar }          from '../ui/Avatar.jsx';
import { RoleBadge }       from '../ui/Badge.jsx';
import { cn }              from '../../utils/cn.js';
import { CreateOrgModal }  from '../../features/organizations/components/OrgComponents.jsx';

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icon = {
  chevronDown: (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
      <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  plus: (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
      <path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
    </svg>
  ),
  board: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="4" height="12" rx="1" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="7" y="1" width="4" height="8"  rx="1" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  ),
  settings: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.5 2.5l1 1M10.5 10.5l1 1M2.5 11.5l1-1M10.5 3.5l1-1"
        stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  members: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="5.5" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 12c0-2.5 2-4 4.5-4s4.5 1.5 4.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <circle cx="10.5" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M13 11.5c0-1.8-1.1-2.9-2.5-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  ),
  activity: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7h2l2-4 2 8 2-5 1.5 3H13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  logout: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M5 1H2a1 1 0 00-1 1v10a1 1 0 001 1h3M9 10l3-3-3-3M12 7H5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  close: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
};

export function Sidebar() {
  const { user, clearAuth }               = useAuthStore();
  const { activeOrgId, setActiveOrg, sidebarOpen, setSidebarOpen } = useUiStore();
  const [orgOpen, setOrgOpen]             = useState(false);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const navigate  = useNavigate();
  const location  = useLocation();

  // Close mobile drawer and org picker on every route change
  useEffect(() => {
    setSidebarOpen(false);
    setOrgOpen(false);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const orgsQuery = useQuery({
    queryKey: ['organizations'],
    queryFn:  () => organizationApi.list().then((r) => r.data.data.orgs),
  });

  const boardsQuery = useQuery({
    queryKey: ['boards', activeOrgId],
    queryFn:  () => boardApi.listByOrg(activeOrgId).then((r) => r.data.data.boards),
    enabled:  !!activeOrgId,
  });

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess:  () => { clearAuth(); navigate('/login'); },
    onError:    () => { clearAuth(); navigate('/login'); },
  });

  const orgs      = orgsQuery.data || [];
  const boards    = boardsQuery.data || [];
  const activeOrg = orgs.find((o) => o.id === activeOrgId || o._id === activeOrgId);

  const isActiveBoard = (id) => location.pathname === `/boards/${id}`;

  function switchOrg(org) {
    setActiveOrg(org.id || org._id);
    setOrgOpen(false);
    navigate(`/organizations/${org.id || org._id}`);
  }

  return (
    <>
      {/* ── Mobile backdrop ──────────────────────────────────────────────── */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] transition-opacity duration-200 md:hidden',
          sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* ── Sidebar panel ────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Mobile: fixed overlay drawer sliding in from left
          'fixed inset-y-0 left-0 z-50 w-64',
          'transition-transform duration-200 ease-out will-change-transform',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          // Desktop md+: static column, always visible, ignore transform
          'md:relative md:w-56 md:translate-x-0 md:z-auto md:transition-none',
          'h-full bg-sidebar flex flex-col shrink-0 border-r border-sidebar-border',
        )}
      >
        {/* Brand + mobile close */}
        <div className="px-4 py-4 border-b border-sidebar-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-brand-600 flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold tracking-tight">TW</span>
            </div>
            <span className="text-zinc-100 text-sm font-semibold tracking-tight">Team Workspace</span>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={() => setSidebarOpen(false)}
            className="md:hidden w-7 h-7 flex items-center justify-center rounded text-zinc-500 hover:text-zinc-300 hover:bg-sidebar-hover transition-colors"
            aria-label="Close sidebar"
          >
            {Icon.close}
          </button>
        </div>

        {/* Org switcher */}
        <div className="px-2 py-2 border-b border-sidebar-border">
          <button
            onClick={() => setOrgOpen((v) => !v)}
            className="w-full flex items-center justify-between px-2 py-2 rounded hover:bg-sidebar-hover transition-colors"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-5 h-5 rounded bg-brand-700 flex items-center justify-center shrink-0">
                <span className="text-white text-2xs font-bold">
                  {activeOrg?.name?.[0]?.toUpperCase() || 'O'}
                </span>
              </div>
              <span className="text-zinc-200 text-xs font-medium truncate">
                {activeOrg?.name || 'Select org'}
              </span>
            </div>
            <span className={cn('text-sidebar-text transition-transform duration-150', orgOpen && 'rotate-180')}>
              {Icon.chevronDown}
            </span>
          </button>

          {orgOpen && (
            <div className="mt-1 mx-1 bg-zinc-800 rounded border border-zinc-700 overflow-hidden shadow-dropdown">
              {orgs.map((org) => (
                <button
                  key={org.id || org._id}
                  onClick={() => switchOrg(org)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-2 text-xs hover:bg-zinc-700 transition-colors',
                    (org.id === activeOrgId || org._id === activeOrgId)
                      ? 'text-zinc-100 bg-zinc-700'
                      : 'text-zinc-400',
                  )}
                >
                  <span className="truncate">{org.name}</span>
                  <RoleBadge role={org.role} />
                </button>
              ))}
              <div className="border-t border-zinc-700">
                <button
                  onClick={() => { setOrgOpen(false); setShowCreateOrg(true); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
                >
                  <span className="text-zinc-600">{Icon.plus}</span>
                  New organization
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 scrollbar-hide">
          {activeOrgId && (
            <>
              <p className="px-3 mb-1 text-2xs font-medium text-sidebar-heading uppercase tracking-widest">
                Boards
              </p>

              {boards.map((board) => (
                <Link
                  key={board.id || board._id}
                  to={`/boards/${board.id || board._id}`}
                  className={cn('nav-item', isActiveBoard(board.id || board._id) && 'active')}
                >
                  <span className="text-sidebar-text shrink-0">{Icon.board}</span>
                  <span className="truncate text-xs">{board.name}</span>
                </Link>
              ))}

              <button
                onClick={() => navigate(`/organizations/${activeOrgId}/boards/new`)}
                className="nav-item w-full text-xs mt-0.5 text-sidebar-heading hover:text-zinc-300"
              >
                <span>{Icon.plus}</span>
                New board
              </button>

              <div className="my-2 border-t border-sidebar-border" />

              <p className="px-3 mb-1 text-2xs font-medium text-sidebar-heading uppercase tracking-widest">
                Workspace
              </p>

              <Link to={`/organizations/${activeOrgId}/members`} className="nav-item text-xs">
                <span className="text-sidebar-text shrink-0">{Icon.members}</span>
                Members
              </Link>

              <Link to={`/organizations/${activeOrgId}/activity`} className="nav-item text-xs">
                <span className="text-sidebar-text shrink-0">{Icon.activity}</span>
                Activity
              </Link>

              <Link to={`/organizations/${activeOrgId}/settings`} className="nav-item text-xs">
                <span className="text-sidebar-text shrink-0">{Icon.settings}</span>
                Settings
              </Link>
            </>
          )}
        </nav>

        {/* User section */}
        <div className="px-2 py-3 border-t border-sidebar-border">
          <div className="flex items-center gap-2.5 px-2 py-2 rounded hover:bg-sidebar-hover group transition-colors">
            <Avatar name={user?.name} size="sm" className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-zinc-200 truncate">{user?.name}</p>
              <p className="text-2xs text-sidebar-text truncate">{user?.email}</p>
            </div>
            <button
              onClick={() => logoutMutation.mutate()}
              className="opacity-0 group-hover:opacity-100 text-sidebar-text hover:text-zinc-200 transition-all"
              title="Sign out"
            >
              {Icon.logout}
            </button>
          </div>
        </div>
      </aside>

      <CreateOrgModal open={showCreateOrg} onClose={() => setShowCreateOrg(false)} />
    </>
  );
}
