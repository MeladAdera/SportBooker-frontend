import { normalizeRole } from '@/lib/roles';

/**
 * Default landing route after login for each role (must match guarded routes).
 */
export function getRoleHomePath(role: string): string {
  const r = normalizeRole(role);
  if (r === 'platform_admin') return '/admin/tenants';
  if (['super_admin', 'tenant_admin', 'tenant_staff'].includes(r)) {
    return '/operator/dashboard';
  }
  if (r === 'player' || r === 'member') return '/home';
  return '/home';
}
