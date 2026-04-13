/**
 * API client (fetch/axios) and shared request types.
 * Orval-generated clients and types go in ./generated (do not edit by hand).
 */
export {
  apiFetch,
  ApiError,
  getApiBaseUrl,
  LOGIN_PATH,
  parseApiErrorBody,
  type ApiErrorEnvelope,
} from './client';
export { unwrap } from './mutator';
export { extractTenantSlug, getAppDomain } from '@/lib/tenant';
