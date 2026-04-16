import { useTenantSettingsControllerGetSettings } from '@/api/generated/tenant-settings/tenant-settings';
import { unwrap } from '@/api';

/**
 * Returns the tenant's configured IANA timezone string.
 * Falls back to the browser's local timezone if the settings endpoint
 * isn't accessible (e.g. player role) or hasn't loaded yet.
 */
export function useTenantTimezone(): string {
  const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { data } = useTenantSettingsControllerGetSettings({
    query: { retry: false, staleTime: 5 * 60 * 1000 },
  });
  const settings = unwrap(data);
  return settings?.timezone ?? browserTz;
}
