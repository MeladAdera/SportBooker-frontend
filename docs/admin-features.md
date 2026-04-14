# Admin features (Sportbooker frontend)

This document describes **administrative** surfaces in the app: **platform administrators** (SportBooker staff) and **tenant operators** (club/venue staff, including tenant-level admins). For player flows and general routing, see [Player flow](player-flow.md) and [Role-based layouts and navigation](role-based-layouts.md).

---

## 1. Platform administrator (`platform_admin`)

Users who manage the **platform** (tenants, global settings), not a single club’s day-to-day operations.

| Item                        | Detail                                                                                                                                                                                       |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Role**                    | `platform_admin` (see [`src/lib/roles.ts`](../src/lib/roles.ts) — `isPlatformAdminRole`)                                                                                                     |
| **Guard**                   | [`PlatformAdminRoute`](../src/routes/guards/PlatformAdminRoute.tsx) — redirects others to `/403`                                                                                             |
| **Layout**                  | [`PlatformAdminLayout`](../src/shared/layouts/PlatformAdminLayout.tsx) — sidebar + [`AppBar`](../src/shared/components/AppBar.tsx) with `isPlatform` (platform wordmark, no tenant branding) |
| **Default URL after login** | `/admin/tenants` via [`getRoleHomePath`](../src/features/auth/utils.ts)                                                                                                                      |
| **i18n namespace**          | `admin` — [`src/i18n/en/admin.json`](../src/i18n/en/admin.json), [`src/i18n/ar/admin.json`](../src/i18n/ar/admin.json) (nav: **Tenants**, **Account**)                                       |

### Routes (`src/App.tsx`)

| Path             | Status      | Notes                                    |
| ---------------- | ----------- | ---------------------------------------- |
| `/admin/tenants` | Placeholder | UI text: “Admin — tenants — coming soon” |
| `/admin/profile` | Placeholder | UI text: “Admin — profile — coming soon” |

**Sidebar navigation:** `/admin/tenants`, `/admin/profile` (icons: Building2, User).

---

## 2. Tenant operators (`super_admin`, `tenant_admin`, `tenant_staff`)

Users who run **one tenant’s** operations (matches, venues, players, settings). Often referred to as “staff” or “tenant admins” in product copy.

| Item                        | Detail                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Roles**                   | `super_admin`, `tenant_admin`, `tenant_staff` — `isOperatorRole` in [`src/lib/roles.ts`](../src/lib/roles.ts)                         |
| **Guard**                   | [`OperatorRoute`](../src/routes/guards/OperatorRoute.tsx) — wraps [`OperatorLayout`](../src/shared/layouts/OperatorLayout.tsx)        |
| **URL prefix**              | All routes live under **`/operator`** so they do not clash with player routes (e.g. player match detail stays `/matches/:id`).        |
| **Default URL after login** | `/operator/dashboard` — [`getRoleHomePath`](../src/features/auth/utils.ts)                                                            |
| **i18n namespace**          | `operator` — [`src/i18n/en/operator.json`](../src/i18n/en/operator.json), [`src/i18n/ar/operator.json`](../src/i18n/ar/operator.json) |

### Routes (`src/App.tsx`)

| Path                    | Feature         | Notes                                                                                                             |
| ----------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------- |
| `/operator/dashboard`   | Dashboard       | KPIs from tenant matches API (month window)                                                                       |
| `/operator/matches`     | Match list      | Filters, pagination, TanStack Table / cards; search debounced (`useDebounce`)                                     |
| `/operator/matches/new` | Create match    | react-hook-form + zod; title, sport (Select), venue (searchable combobox), date + time, duration, capacity, price |
| `/operator/matches/:id` | Match detail    | Full match + roster; waitlist section shows API-gap notice                                                        |
| `/operator/venues`      | Placeholder     | “Venues — coming soon”                                                                                            |
| `/operator/players`     | Placeholder     | “Players — coming soon”                                                                                           |
| `/operator/settings`    | Tenant settings | Ziina payment integration ([`TenantSettingsPage`](../src/features/operator/pages/TenantSettingsPage.tsx))         |

**Not implemented as routes yet:** `/account` is linked from the operator sidebar and app bar but has no matching route (documented in [role-based-layouts.md](role-based-layouts.md)).

### Role-specific behaviour (tenant)

| Capability                                 | `super_admin`          | `tenant_admin` | `tenant_staff` |
| ------------------------------------------ | ---------------------- | -------------- | -------------- |
| **Create match** (`/operator/matches/new`) | Yes                    | Yes            | Yes            |
| **Cancel match** (list + detail)           | Yes                    | Yes            | No             |
| **Tenant settings** (`/operator/settings`) | Yes (nav item visible) | Hidden         | Hidden         |

Implemented via [`normalizeRole`](../src/lib/roles.ts) checks in [`MatchListPage`](../src/features/operator/pages/MatchListPage.tsx), [`OperatorMatchDetailPage`](../src/features/operator/pages/OperatorMatchDetailPage.tsx), and [`OperatorLayout`](../src/shared/layouts/OperatorLayout.tsx) (`superAdminOnly` on settings nav item).

---

## 3. How “admin” roles differ

| Concern         | Platform admin                                     | Tenant operators                                                          |
| --------------- | -------------------------------------------------- | ------------------------------------------------------------------------- |
| **Scope**       | All tenants / platform                             | Single tenant (club)                                                      |
| **Layout**      | `PlatformAdminLayout`                              | `OperatorLayout`                                                          |
| **Primary nav** | Tenants, Account                                   | Dashboard, Matches, Venues, Players, Settings (super_admin only), Account |
| **API context** | Uses auth + tenant headers as issued for that user | Same — tenant-scoped endpoints (e.g. `GET /tenant/matches`)               |

---

## 4. Related source index

| Concern                | Location                                                                                                                                    |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Route table            | [`src/App.tsx`](../src/App.tsx)                                                                                                             |
| Role → home URL        | [`src/features/auth/utils.ts`](../src/features/auth/utils.ts)                                                                               |
| Operator pages         | [`src/features/operator/pages/`](../src/features/operator/pages/)                                                                           |
| Operator barrel export | [`src/features/operator/index.ts`](../src/features/operator/index.ts)                                                                       |
| Shared UI              | `src/components/ui/` — `Select`, `Label`, `DatePicker`, `Input`, `Popover`, `Button`, `Card`, `Badge`, `Skeleton`, `Dialog`, `DropdownMenu` |

---

## 5. Version history (archive)

Earlier releases were tracked in `CHANGELOG.md` using [Keep a Changelog](https://keepachangelog.com/). **0.1.0** (2026-04-12) introduced scaffolding, auth, role guards, player features, tenant settings (Ziina), shared UI, API client, and i18n namespaces including `admin` and `operator`. Subsequent operator work (dashboard, match list, match detail, `/operator` routing, debounced search, create match form) is summarized in sections 1–2 above.
