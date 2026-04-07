# Local development — API, tenant host, and auth

This document describes how the frontend talks to the Nest backend during local development, why the Vite proxy exists, and how login responses are handled.

## Quick checklist

1. Copy **`.env.example`** → **`.env`**. Baseline: **`VITE_API_URL`** (e.g. `http://localhost:3000`) and **`VITE_APP_DOMAIN`** (e.g. `sportbooker.com`) for `extractTenantSlug()`.
2. Backend runs on **port 3000** (default in this doc).
3. Frontend runs with **`npm run dev`** (Vite, default port **5173**).
4. **Optional (Nest tenant `Host`):** set **`VITE_API_URL=/api`** so requests go through the **Vite proxy** and set **`VITE_DEV_TENANT_SLUG`** (e.g. `acfc`).
5. **Restart the dev server** after changing `.env` or `vite.config.ts` (Vite reads env at startup; proxy config is applied on boot).

## Why `/api` and a proxy?

The browser **cannot set the `Host` header** on `fetch`. The backend resolves the tenant from the request host (e.g. `acfc.localhost:3000`). If the SPA calls `http://localhost:3000` directly, the request arrives with `Host: localhost:3000` and the API may respond with **400 — Missing or invalid subdomain**.

The Vite dev server proxies **`/api/*`** to the backend and sets **`Host`** on the outgoing request so it matches what Nest expects:

- **`http://downtown.localhost:5173`** → `Host: downtown.localhost:3000` (same tenant as Postman to `downtown.localhost:3000`).
- **`http://localhost:5173`** (no subdomain) → `Host: {VITE_DEV_TENANT_SLUG}.localhost:3000` (e.g. `acfc`).

| Browser request                                      | Proxied to backend                                                                                          |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `POST http://downtown.localhost:5173/api/auth/login` | `POST http://localhost:3000/auth/login` with `Host: downtown.localhost:3000`                                |
| `POST http://localhost:5173/api/auth/login`          | `POST http://localhost:3000/auth/login` with `Host: acfc.localhost:3000` (when `VITE_DEV_TENANT_SLUG=acfc`) |

See `vite.config.ts` — `server.proxy['/api']` and the `proxyReq` handler that sets `Host`.

## Environment variables

| Variable               | Purpose                                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`         | Base path for API calls. Use **`/api`** in local dev so traffic hits the Vite proxy.                                                        |
| `VITE_DEV_TENANT_SLUG` | Tenant slug used to build the injected `Host` header: `{slug}.localhost:3000`.                                                              |
| `VITE_APP_DOMAIN`      | Apex domain for **subdomain → slug** parsing in the app (e.g. `sportbooker.com`). Used by `extractTenantSlug()` for production-style hosts. |
| `VITE_API_BASE_URL`    | Legacy fallback in `lib/api-url.ts` if `VITE_API_URL` is unset. Prefer `VITE_API_URL`.                                                      |

**Alternative:** Point `VITE_API_URL` at `http://localhost:3000` only if you do not need tenant routing via `Host`, or if you use another mechanism (e.g. a custom header) that the backend supports.

## Optional: real subdomain in the browser

You can open the app at **`http://acfc.localhost:5173`** (with `host: true` or network access) so `window.location.hostname` matches a tenant subdomain. You still need the proxy + `VITE_DEV_TENANT_SLUG` alignment unless the backend reads tenant another way.

## Auth API — response shape

The Nest API wraps JSON bodies like:

```json
{
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 900
  },
  "statusCode": 201
}
```

The client **unwraps** `data` in:

- `src/features/auth/api.ts` — login
- `src/stores/authStore.ts` — refresh token parsing

Login does not return a full `user` object. The app builds **`AuthUser`** from the **JWT payload** (e.g. `sub` → id, `role`, `tenantId`; email falls back to the submitted email).

## Troubleshooting

| Symptom                                | Likely cause                                                                                               |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **400 — Missing or invalid subdomain** | Proxy not injecting `Host`, or wrong `VITE_DEV_TENANT_SLUG`, or dev server not restarted after env change. |
| **Network / failed fetch**             | Backend not running, or `VITE_API_URL` wrong.                                                              |
| **TypeError around URL**               | Relative API base is handled in `api/client.ts` for pathname parsing; ensure `VITE_API_URL` is consistent. |

## Related files

- `vite.config.ts` — proxy, `Host` injection
- `src/lib/api-url.ts` — `resolveApiUrl`, base URL
- `src/api/client.ts` — `apiFetch`, auth retry, pathname handling for relative URLs
- `src/features/auth/api.ts` — login, envelope unwrap, JWT → user
- `src/stores/authStore.ts` — refresh, envelope unwrap
