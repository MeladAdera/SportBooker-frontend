/**
 * Stores: auth, tenant, theme, locale (add slices as you implement them).
 */
export {
  authStore,
  useAuthStore,
  type AuthState,
  type AuthUser,
} from './authStore';
export { useTenantStore, type TenantState } from './tenantStore';
export { useLocaleStore, type Locale } from './localeStore';
