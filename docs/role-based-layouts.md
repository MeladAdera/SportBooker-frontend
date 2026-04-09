# Role-based layouts and navigation

This document describes the **player**, **operator** (tenant staff), and **platform admin** shells: layouts, app bar, routing, and how they map to user roles. It aligns with the product IA (design brief §6) and the rule to **hide** controls a role cannot use—not merely disable them (§10.4).

## Quick reference

| Role(s)                                       | Layout component                                                       | Default URL after login / `/`                                |
| --------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `player`, `member`                            | [`PlayerLayout`](../src/shared/layouts/PlayerLayout.tsx)               | `/home` ([`getRoleHomePath`](../src/features/auth/utils.ts)) |
| `super_admin`, `tenant_admin`, `tenant_staff` | [`OperatorLayout`](../src/shared/layouts/OperatorLayout.tsx)           | `/dashboard`                                                 |
| `platform_admin`                              | [`PlatformAdminLayout`](../src/shared/layouts/PlatformAdminLayout.tsx) | `/admin/tenants`                                             |

**How routing picks a shell:** route guards wrap nested routes and render the matching layout + [`Outlet`](https://reactrouter.com/en/main/components/outlet). There is no single “layout switch” component; the **first guard whose role matches** owns the tree for that URL segment (see [App routes](#app-routes) below).

---

## 1. Player layout + bottom navigation

**Source:** [`src/shared/layouts/PlayerLayout.tsx`](../src/shared/layouts/PlayerLayout.tsx)

**Behavior:**

- **Mobile (`md` breakpoint and below):** fixed **bottom navigation** (4 items), full width, `pb-16` on `<main>` so content clears the bar.
- **Desktop (`md+`):** **left sidebar** with the same four links; bottom nav is hidden (`md:hidden` on the bottom `<nav>`).
- **Wallet balance:** read from `useAuthStore` → `user.walletBalance`. Shown next to the Wallet label when present (formatted with `Intl.NumberFormat`).
- **App bar:** full-width [`AppBar`](#4-app-bar-tenant-branding-and-actions) above the sidebar/content split (`profilePath="/profile"`).

**Navigation targets (paths):**

| Path        | i18n key (`player` namespace) | Notes                                                                                                                               |
| ----------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `/home`     | `nav.home`                    | Label in EN is **“Home”**. Product copy may use “Home / Discover”; `/discover` in [`App.tsx`](../src/App.tsx) redirects to `/home`. |
| `/bookings` | `nav.bookings`                | “My Bookings” in EN.                                                                                                                |
| `/wallet`   | `nav.wallet`                  | Balance line under label when `walletBalance` is set.                                                                               |
| `/profile`  | `nav.profile`                 |                                                                                                                                     |

**Translations:** [`src/i18n/en/player.json`](../src/i18n/en/player.json), [`src/i18n/ar/player.json`](../src/i18n/ar/player.json).

**Guard:** [`PlayerRoute`](../src/routes/guards/PlayerRoute.tsx) checks [`isPlayerRole`](../src/lib/roles.ts), then renders `<PlayerLayout><Outlet /></PlayerLayout>`.

---

## 2. Operator layout + sidebar

**Source:** [`src/shared/layouts/OperatorLayout.tsx`](../src/shared/layouts/OperatorLayout.tsx)

**Behavior:**

- **Desktop:** persistent **left sidebar** (`md+`), same width pattern as player (`w-56` / `lg:w-64`).
- **Mobile:** sidebar is **not** always visible. A **hamburger** row opens a **slide-in drawer** (overlay + panel). Drawer closes on route change, Escape, or overlay click. Body scroll is locked while open.
- **Tenant Settings:** nav item `to="/settings"`, `superAdminOnly: true`. Items with `superAdminOnly` are **omitted from the list** for non–`super_admin` users (not shown disabled).
- **Account:** nav item `to="/account"` (i18n `operator.nav.account`). Ensure a matching route exists under `OperatorRoute` when the account screen is built.

**Navigation targets:**

| Path         | i18n key (`operator` namespace) | Visibility                                 |
| ------------ | ------------------------------- | ------------------------------------------ |
| `/dashboard` | `nav.dashboard`                 | All operators                              |
| `/matches`   | `nav.matches`                   | All operators                              |
| `/venues`    | `nav.venues`                    | All operators                              |
| `/players`   | `nav.players`                   | All operators                              |
| `/settings`  | `nav.tenantSettings`            | **`super_admin` only** (hidden for others) |
| `/account`   | `nav.account`                   | All operators                              |

**App bar:** [`AppBar`](#4-app-bar-tenant-branding-and-actions) with `profilePath="/account"` (dropdown “Profile” navigates there).

**Guard:** [`OperatorRoute`](../src/routes/guards/OperatorRoute.tsx) uses [`isOperatorRole`](../src/lib/roles.ts), then `<OperatorLayout><Outlet /></OperatorLayout>`.

---

## 3. Platform admin layout + sidebar

**Source:** [`src/shared/layouts/PlatformAdminLayout.tsx`](../src/shared/layouts/PlatformAdminLayout.tsx)

**Behavior:**

- **No tenant branding** in the app bar: [`AppBar`](../src/shared/components/AppBar.tsx) is called with **`isPlatform`**, which renders the **platform wordmark** (“SportBooker Platform” + “PA” badge) instead of club logo/name from [`tenantStore`](../src/stores/tenantStore.ts).
- **Sidebar:** always visible in the current implementation (desktop-oriented width). Items: **Tenants**, **Account** (platform profile).
- **Notification bell:** same placeholder as tenant routes ([`AppBar`](#4-app-bar-tenant-branding-and-actions)).

**Navigation targets:**

| Path             | i18n key (`admin` namespace) |
| ---------------- | ---------------------------- |
| `/admin/tenants` | `nav.tenants`                |
| `/admin/profile` | `nav.account`                |

**Guard:** [`PlatformAdminRoute`](../src/routes/guards/PlatformAdminRoute.tsx) uses [`isPlatformAdminRole`](../src/lib/roles.ts), then `<PlatformAdminLayout><Outlet /></PlatformAdminLayout>`.

---

## 4. App bar (tenant branding zone)

**Source:** [`src/shared/components/AppBar.tsx`](../src/shared/components/AppBar.tsx)

| Area      | Tenant / operator routes (`isPlatform` false)                                                                                  | Platform admin (`isPlatform` true)                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| **Left**  | Club **logo** (if `tenantInfo.logoUrl`) or initial in a tile; **name** from `tenantInfo.name` or slug (see `Branding` in file) | **“SportBooker Platform”** + small “PA” badge                        |
| **Right** | **Notification bell** — button only, no badge logic yet (placeholder)                                                          | Same                                                                 |
| **Right** | **User avatar** (photo or initials) opens **dropdown**: name/email, **Profile** (navigates to `profilePath`), **Logout**       | Same, with `profilePath` defaulting to `/admin/profile` when omitted |

**State:** branding reads [`useTenantStore`](../src/stores/tenantStore.ts) (`tenantInfo`, `slug`). User reads [`useAuthStore`](../src/stores/authStore.ts). Logout calls store `logout` then `navigate('/login', { replace: true })`.

**i18n:** `common` namespace — keys such as `appBar.notifications`, `appBar.userMenu`, `appBar.profile`, `appBar.logout` ([`src/i18n/en/common.json`](../src/i18n/en/common.json)).

---

## 5. Role-based router (post-login and `/`)

**Sources:**

- [`src/routes/RoleBasedRouter.tsx`](../src/routes/RoleBasedRouter.tsx) — mounted as the **protected index route** (`path` `/` inside `ProtectedRoute`). Renders `<Navigate to={getRoleHomePath(role)} replace />` using `user.role` from `authStore`.
- [`src/features/auth/utils.ts`](../src/features/auth/utils.ts) — `getRoleHomePath(role)` must stay in sync with **actual guarded paths** in `App.tsx`.

**Login flow:** after successful login, auth pages typically `navigate(getRoleHomePath(role))` (see login/register flows) so the user lands in the correct layout immediately.

**Hierarchy (conceptual):**

1. `ProtectedRoute` — requires auth; shows loader until `isSessionReady`.
2. Index `/` → `RoleBasedRouter` → redirect to role home.
3. Child routes are grouped under `PlayerRoute`, `OperatorRoute`, or `PlatformAdminRoute`; each guard **both** checks role **and** wraps content in the right layout.

---

## 6. App routes (snapshot)

Defined in [`src/App.tsx`](../src/App.tsx). Public: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/403`, `/discover` → `/home`. Protected children include player paths (`home`, `bookings`, `wallet`, `profile`), operator paths (`dashboard`, `matches`, `venues`, `players`, `settings`), and platform admin (`admin/tenants`, `admin/profile`).

**Note:** If the operator UI links to `/account`, add a sibling `<Route path="account" element={...} />` under `OperatorRoute` when that page exists.

---

## 7. Discover page (player home — `/home`)

**Source:** [`src/features/player/pages/DiscoverPage.tsx`](../src/features/player/pages/DiscoverPage.tsx)

This is the first real page rendered inside `PlayerLayout` at `/home`.

**What it renders:**

- Filter bar: sport dropdown, venue dropdown, date picker, "available only" toggle, clear button.
- Match card grid: each card shows sport, venue, date/time, spots remaining (`booked / total`), price per player, and match status.
- Empty state when no matches pass the active filters.

**Data:** `useMatchesControllerList` / `useVenuesControllerList` (Orval-generated React Query hooks). See **[Player flow](player-flow.md)** for full detail.

**i18n:** all strings live in `discover.*` keys under the `player` namespace (`src/i18n/en/player.json`, `src/i18n/ar/player.json`).

---

## 8. File index (updated)

| Concern                | Location                                                                           |
| ---------------------- | ---------------------------------------------------------------------------------- |
| Player shell           | `src/shared/layouts/PlayerLayout.tsx`                                              |
| Operator shell         | `src/shared/layouts/OperatorLayout.tsx`                                            |
| Platform admin shell   | `src/shared/layouts/PlatformAdminLayout.tsx`                                       |
| Player home (Discover) | `src/features/player/pages/DiscoverPage.tsx`                                       |
| Top bar                | `src/shared/components/AppBar.tsx`                                                 |
| Role → home URL        | `src/features/auth/utils.ts` (`getRoleHomePath`)                                   |
| `/` redirect           | `src/routes/RoleBasedRouter.tsx`                                                   |
| Guards + layout wiring | `src/routes/guards/PlayerRoute.tsx`, `OperatorRoute.tsx`, `PlatformAdminRoute.tsx` |
| Role predicates        | `src/lib/roles.ts`                                                                 |
| Route table            | `src/App.tsx`                                                                      |

---

## 9. Acceptance criteria checklist

| Criterion                                                 | Where it’s implemented                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------- |
| Player: bottom nav on mobile, sidebar on desktop          | `PlayerLayout` — `md:hidden` bottom nav, `hidden md:flex` sidebar |
| Wallet balance visible for player                         | `PlayerNavItem` + `walletBalance` from `authStore`                |
| Operator: sidebar; Tenant Settings only for `super_admin` | `NAV_ITEMS` + `filter` on `superAdminOnly`                        |
| Platform admin: no tenant branding                        | `AppBar isPlatform` + `PlatformAdminLayout`                       |
| App bar: tenant logo/name on tenant routes                | `Branding` when `!isPlatform`                                     |
| Notification bell placeholder                             | `AppBar` bell `button`                                            |
| Role-based router after login / `/`                       | `getRoleHomePath` + `RoleBasedRouter`                             |
| Operator nav collapsible on mobile                        | `OperatorLayout` drawer + hamburger                               |

---

## 10. Optional follow-ups (not blockers for this doc)

- Add `/account` route under `OperatorRoute` when the account page ships.
- Align copy (“Home” vs “Discover”) with design if `/discover` remains a marketing alias only (`Navigate` to `/home` is already in place).
