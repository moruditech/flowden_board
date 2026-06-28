import { useEffect, lazy, Suspense } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'react-hot-toast';

import { queryClient }                      from './lib/queryClient.js';
import { authApi }                          from './api/auth.api.js';
import { useAuthStore }                     from './store/authStore.js';
import { useUiStore }                       from './store/uiStore.js';
import { AppLayout }                        from './components/layout/AppLayout.jsx';
import { ProtectedRoute, GuestRoute }       from './components/shared/ProtectedRoute.jsx';
import { ErrorBoundary }                    from './components/shared/ErrorBoundary.jsx';
import { PageSpinner }                      from './components/ui/Spinner.jsx';

// ── Lazy-loaded pages ─────────────────────────────────────────────────────────
const LoginPage           = lazy(() => import('./features/auth/LoginPage.jsx'));
const RegisterPage        = lazy(() => import('./features/auth/RegisterPage.jsx'));
const ForgotPasswordPage  = lazy(() => import('./features/auth/ForgotPasswordPage.jsx'));
const ResetPasswordPage   = lazy(() => import('./features/auth/ResetPasswordPage.jsx'));
const VerifyEmailPage     = lazy(() => import('./features/auth/VerifyEmailPage.jsx'));
const InviteAcceptPage    = lazy(() => import('./features/invites/InviteAcceptPage.jsx'));
const OrgDashboard        = lazy(() => import('./features/organizations/OrgDashboard.jsx'));
const MembersPage         = lazy(() => import('./features/organizations/MembersPage.jsx'));
const InvitesPage         = lazy(() => import('./features/organizations/InvitesPage.jsx'));
const BoardsListPage      = lazy(() => import('./features/boards/BoardsListPage.jsx'));
const BoardPage           = lazy(() => import('./features/boards/BoardPage.jsx'));
const ActivityFeed        = lazy(() => import('./features/activity/ActivityFeed.jsx'));

// ── Auth initialiser — silently restores session on hard reload ───────────────
function AuthInitialiser({ children }) {
  const { setAuth, clearAuth, setInitialised } = useAuthStore();
  const { setActiveOrg }                       = useUiStore();

  useEffect(() => {
    authApi.refresh()
      .then(({ data }) => {
        const { user, accessToken } = data.data;
        setAuth(user, accessToken);
        // Restore last active org from localStorage if available
        const lastOrg = localStorage.getItem('activeOrgId');
        if (lastOrg) setActiveOrg(lastOrg);
      })
      .catch(() => clearAuth())
      .finally(() => setInitialised());
  }, []);

  return children;
}

// ── Root ──────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AuthInitialiser>
            <Suspense fallback={<PageSpinner />}>
              <Routes>
                {/* ── Guest-only routes ─────────────────────────────────── */}
                <Route element={<GuestRoute />}>
                  <Route path="/login"           element={<LoginPage />} />
                  <Route path="/register"        element={<RegisterPage />} />
                  <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                  <Route path="/reset-password"  element={<ResetPasswordPage />} />
                </Route>

                {/* ── Public (auth-optional) routes ─────────────────────── */}
                <Route path="/verify-email"    element={<VerifyEmailPage />} />
                <Route path="/invites/accept"  element={<InviteAcceptPage />} />

                {/* ── Protected routes ──────────────────────────────────── */}
                <Route element={<ProtectedRoute />}>
                  <Route element={<AppLayout />}>
                    {/* Default redirect */}
                    <Route index element={<Navigate to="/boards" replace />} />

                    {/* Boards */}
                    <Route path="/boards"         element={<BoardsListPage />} />
                    <Route path="/boards/:boardId" element={<BoardPage />} />

                    {/* Organizations */}
                    <Route path="/organizations/:orgId" element={<OrgDashboard />} />
                    <Route path="/organizations/:orgId/members"  element={<MembersPage />} />
                    <Route path="/organizations/:orgId/invites"  element={<InvitesPage />} />
                    <Route path="/organizations/:orgId/activity" element={<ActivityFeed />} />

                    {/* Catch-all */}
                    <Route path="*" element={<Navigate to="/boards" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
          </AuthInitialiser>
        </ErrorBoundary>
      </BrowserRouter>

      <Toaster
        position="bottom-right"
        toastOptions={{
          duration:  3000,
          style:     { fontSize: '13px', borderRadius: '6px' },
          success:   { iconTheme: { primary: '#0d9488', secondary: '#fff' } },
        }}
      />

      {import.meta.env.DEV && <ReactQueryDevtools buttonPosition="bottom-left" />}
    </QueryClientProvider>
  );
}
