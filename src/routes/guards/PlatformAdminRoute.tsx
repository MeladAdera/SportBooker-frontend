import { Navigate, Outlet } from 'react-router-dom';

import { isPlatformAdminRole } from '@/lib/roles';
import { PlatformAdminLayout } from '@/shared/layouts/PlatformAdminLayout';
import { useAuthStore } from '@/stores/authStore';

/** Platform-level admin only. */
export function PlatformAdminRoute() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  if (!isPlatformAdminRole(role)) {
    return <Navigate to="/403" replace />;
  }

  return (
    <PlatformAdminLayout>
      <Outlet />
    </PlatformAdminLayout>
  );
}
