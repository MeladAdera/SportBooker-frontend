import { Loader2 } from 'lucide-react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';

const LOGIN_PATH = '/login';

/**
 * Requires authentication. Redirects to login when not authenticated.
 */
export function ProtectedRoute() {
  const location = useLocation();
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!isSessionReady) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={LOGIN_PATH} replace state={{ from: location.pathname }} />
    );
  }

  return <Outlet />;
}
