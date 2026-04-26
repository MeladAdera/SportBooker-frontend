import { lazy, Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { Navigate } from 'react-router-dom';

import { getRoleHomePath } from '@/features/auth/utils';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';

const TenantLandingPage = lazy(() =>
  import('@/features/tenant-public').then((m) => ({
    default: m.TenantLandingPage,
  })),
);

function RootLoader() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background">
      <Loader2 className="size-8 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * Decides what `/` renders, based on tenant slug + auth state.
 *
 * - Tenant subdomain (e.g. `acfc.sportbooker.net/`):
 *   - anon visitors → public `<TenantLandingPage />` (indexable, marketing).
 *   - authed users  → redirect to their role home (preserves the previous
 *     `RoleBasedRouter` behaviour for logged-in members).
 * - Reserved hosts (`platform`, apex/`null`):
 *   - anon → redirect to `/login` (preserves today's flow).
 *   - authed → redirect to role home.
 *
 * The `TenantLandingPage` itself is public — no `<ProtectedRoute>` wrapper —
 * so search engines and social crawlers can reach it without auth.
 */
export function RootRouter() {
  const isTenantResolved = useTenantStore((s) => s.isResolved);
  const slug = useTenantStore((s) => s.slug);
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role ?? '');

  if (!isTenantResolved || !isSessionReady) {
    return <RootLoader />;
  }

  const isTenantHost = !!slug && slug !== 'platform';

  if (isAuthenticated) {
    return <Navigate to={getRoleHomePath(role)} replace />;
  }

  if (isTenantHost) {
    return (
      <Suspense fallback={<RootLoader />}>
        <TenantLandingPage />
      </Suspense>
    );
  }

  return <Navigate to="/login" replace />;
}
