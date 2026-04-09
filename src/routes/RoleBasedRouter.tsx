import { Navigate } from 'react-router-dom';

import { getRoleHomePath } from '@/features/auth/utils';
import { useAuthStore } from '@/stores/authStore';

/**
 * Redirects authenticated users to their role's default home path.
 *
 * Place this as the index route inside <ProtectedRoute> so that hitting "/"
 * while authenticated always lands the user at the correct starting page for
 * their role (e.g. operators → /dashboard, platform admins → /admin/tenants).
 *
 * The actual layout and route guards (PlayerRoute, OperatorRoute,
 * PlatformAdminRoute) are responsible for rendering the correct shell and
 * restricting access — this component only handles the initial redirect.
 */
export function RoleBasedRouter() {
  const role = useAuthStore((s) => s.user?.role ?? '');
  return <Navigate to={getRoleHomePath(role)} replace />;
}
