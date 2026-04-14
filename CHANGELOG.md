# Changelog

This document records notable changes to the Sportbooker frontend. For day-to-day feature behaviour, see the feature docs (e.g. [Player flow](docs/player-flow.md), [Role-based layouts and navigation](docs/role-based-layouts.md)).

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0/) where applicable.

---

## [Unreleased]

### Added

- **Operator — Dashboard** (`/dashboard`): Stats page replacing the "coming soon" placeholder. Derives four KPIs from `GET /tenant/matches` scoped to the current calendar month (`dateFrom`/`dateTo`): Today's Matches, Players This Month, Match Occupancy (%), and Revenue This Month. Loading state renders skeleton cards; error state shows `—` without crashing. Period label in the header shows the active date window using `Intl.DateTimeFormat`.
  - Source: `src/features/operator/pages/DashboardPage.tsx`
  - i18n: `operator.dashboard.*` keys (en + ar)

- **Operator — Match list** (`/matches`): Full list view replacing the "coming soon" placeholder. Server-side filtering and pagination via `useTenantMatchesControllerList` (search, status, venue, sport, date range; 20 items/page). Desktop layout uses TanStack Table; narrow screens use stacked cards. Row actions navigate to view, edit, and cancel flows. **Cancel** is visible only for `super_admin` and `tenant_admin`, hidden for `tenant_staff`.
  - Source: `src/features/operator/pages/MatchListPage.tsx`
  - i18n: `operator.matches.*` keys (en + ar)

- **UI — `DatePicker`** (`src/components/ui/date-picker.tsx`): Reusable date picker built on shadcn `Calendar` + `Popover`. Trigger shows a formatted date or placeholder text. Accepts `fromDate`/`toDate` props to constrain the selectable range. Used in both the operator match list filters and the player discover page.
  - Also added: `src/components/ui/calendar.tsx`, `src/components/ui/popover.tsx` (via shadcn CLI).

### Changed

- **Player — Discover** (`/home`): Date filter replaced native `<input type="date">` with the shared `DatePicker` component. Stored value shape (`YYYY-MM-DD` string) is unchanged.
  - Source: `src/features/player/pages/DiscoverPage.tsx`

### Dependencies

- `@tanstack/react-table` — TanStack Table for the operator match list desktop view.
- `react-day-picker` — calendar primitive used by `DatePicker`.

---

## [0.1.0] — 2026-04-12

### Added

- Initial frontend scaffolding: Vite + React + TypeScript, ESLint, Prettier, Husky, lint-staged.
- Auth flows: login, register, forgot password, reset password.
- Role-based routing: `PlayerRoute`, `OperatorRoute`, `PlatformAdminRoute` guards with layout shells.
- Player features: Discover page (match browse + filters + pagination), Match Detail, My Bookings, Wallet (top-up flow), Profile.
- Operator features: Tenant Settings (Ziina payment integration).
- Shared: `AppBar`, `LocaleSwitcher`, `ThemeToggle`, RTL support (`useRTL`, `HtmlLangDir`).
- Stores: auth, tenant, theme, locale (Zustand + persistence).
- API client: `apiFetch` with auth headers, 401 refresh retry, `ApiError`, Orval-generated hooks.
- i18n: English + Arabic for `common`, `auth`, `player`, `operator`, `admin` namespaces.
- UI primitives: `Badge`, `Button`, `Card`, `Dialog`, `DropdownMenu`, `Input`, `Skeleton`.
