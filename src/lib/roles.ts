/**
 * Normalized role strings match backend (snake_case), e.g. super_admin, tenant_staff.
 * JWT may use underscores; some legacy paths used hyphens — we normalize.
 */
export function normalizeRole(role: string): string {
  return role.trim().toLowerCase().replace(/-/g, '_');
}

const PLAYER = new Set(['player']);
const OPERATOR = new Set(['super_admin', 'tenant_admin', 'tenant_staff']);
const PLATFORM_ADMIN = new Set(['platform_admin']);

export function isPlayerRole(role: string): boolean {
  return PLAYER.has(normalizeRole(role));
}

export function isOperatorRole(role: string): boolean {
  return OPERATOR.has(normalizeRole(role));
}

export function isPlatformAdminRole(role: string): boolean {
  return PLATFORM_ADMIN.has(normalizeRole(role));
}
