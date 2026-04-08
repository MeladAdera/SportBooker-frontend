import { Navigate, Outlet } from 'react-router-dom';

import { isOperatorRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';

/** Tenant operators: super_admin, tenant_admin, tenant_staff. */
export function OperatorRoute() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  if (!isOperatorRole(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
