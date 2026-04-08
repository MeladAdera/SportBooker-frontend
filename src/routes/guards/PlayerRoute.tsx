import { Navigate, Outlet } from 'react-router-dom';

import { isPlayerRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';

/** Player (`player`) — booking, wallet, profile. */
export function PlayerRoute() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? '';

  if (!isPlayerRole(role)) {
    return <Navigate to="/403" replace />;
  }

  return <Outlet />;
}
