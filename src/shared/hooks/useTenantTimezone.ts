import { useTenantSettingsControllerGetSettings } from '@/api/generated/tenant-settings/tenant-settings';
import { unwrap } from '@/api';
import { isOperatorRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';

/**
 * Returns the tenant's configured IANA timezone string.
 * Falls back to the browser's local timezone if the settings endpoint
 * isn't accessible (e.g. player role) or hasn't loaded yet.
 */
export function useTenantTimezone(): string {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const role = useAuthStore((s) => s.user?.role ?? '');
  const { data } = useTenantSettingsControllerGetSettings({
    query: {
      enabled: isOperatorRole(role),
      retry: false,
      staleTime: 5 * 60 * 1000,
    },
  });
  const settings = unwrap(data);
  return settings?.timezone ?? browserTz;
}
