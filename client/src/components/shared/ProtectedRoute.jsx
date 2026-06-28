import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore.js';
import { PageSpinner } from '../ui/Spinner.jsx';

export function ProtectedRoute() {
  const { user, isInitialised } = useAuthStore();

  if (!isInitialised) return <PageSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return <Outlet />;
}

export function GuestRoute() {
  const { user, isInitialised } = useAuthStore();

  if (!isInitialised) return <PageSpinner />;
  if (user) return <Navigate to="/" replace />;

  return <Outlet />;
}
