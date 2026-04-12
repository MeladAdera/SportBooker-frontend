# Player flow

This document covers the full player journey from login to discovering and browsing matches. It is the authoritative reference for the player shell, navigation, and the Discover page.

---

## 1. Authentication → player home

```
User submits login form
  → POST /auth/login
  → authStore.login(accessToken, refreshToken, expiresIn, user)
  → navigate(getRoleHomePath('player'))   // → '/home'
  → RoleBasedRouter (at '/') also redirects to '/home' for direct visits
```

**Source files:**

- Login form: `src/features/auth/pages/LoginPage.tsx`
- Role → path mapping: `src/features/auth/utils.ts` (`getRoleHomePath`)
- Index redirect: `src/routes/RoleBasedRouter.tsx`

---

## 2. Player shell (`PlayerLayout`)

**Source:** `src/shared/layouts/PlayerLayout.tsx`

### Structure

```
┌──────────────────────────────────────────┐
│  AppBar (tenant logo + bell + avatar)    │  ← h-14, full width
├──────────┬───────────────────────────────┤
│ Sidebar  │                               │
│ (desktop │   <Outlet /> / page content   │
│  only)   │                               │
└──────────┴───────────────────────────────┘
           ┌───────────────────────────────┐
           │  Bottom nav (mobile only)     │  ← fixed, h-16
           └───────────────────────────────┘
```

### Responsive behaviour

| Breakpoint       | Navigation                                                                              |
| ---------------- | --------------------------------------------------------------------------------------- |
| `< md` (mobile)  | Fixed bottom nav bar, 4 items, `h-16`. `<main>` gets `pb-16` so content clears the bar. |
| `≥ md` (desktop) | Left sidebar `w-56` (`lg:w-64`). Bottom nav hidden (`md:hidden`).                       |

### Navigation items

| Path        | Label key (`player` ns) | Icon       | Notes                                                 |
| ----------- | ----------------------- | ---------- | ----------------------------------------------------- |
| `/home`     | `nav.home`              | `Home`     | Discover page                                         |
| `/bookings` | `nav.bookings`          | `BookOpen` | My bookings                                           |
| `/wallet`   | `nav.wallet`            | `Wallet`   | Shows balance inline when `user.walletBalance` is set |
| `/profile`  | `nav.profile`           | `User`     | Player profile                                        |

### Wallet balance display

`user.walletBalance` (`number | null`) is read from `authStore`. When non-null, it renders as a secondary line under the "Wallet" label (`Intl.NumberFormat`, locale-aware). On mobile it appears as a smaller sub-label below the icon; on desktop as a second line in the sidebar item.

Currently `walletBalance` is `null` until the wallet API wires it up — no balance is shown in that state.

### App bar (`AppBar`)

Rendered above the sidebar/content split. Shows:

- **Left:** tenant logo (from `tenantStore.tenantInfo.logoUrl`) or initials fallback + tenant name.
- **Right:** notification bell (placeholder) + user avatar → dropdown with Profile link and Logout.

---

## 3. Discover page (`/home`)

**Source:** `src/features/player/pages/DiscoverPage.tsx`

### Purpose

The player's landing page after login. Lists available matches so a player can find and eventually book a spot.

### Layout

```
/home
├── Page title: "Discover Matches"
├── FilterBar
│   ├── Sport dropdown (football / padel / cricket / generic)
│   ├── Venue dropdown  (fetched from API via useVenuesControllerList)
│   ├── Date input      (type="date")
│   ├── "Available only" checkbox
│   └── "Clear filters" button  (shown only when any filter is active)
├── Match grid  (1 col → 2 col sm → 3 col lg)
│   └── MatchCard × N   (or MatchCardSkeleton × 12 while loading)
├── EmptyState          (when matches.length === 0 and not loading)
└── Pagination          (hidden when totalPages ≤ 1)
```

### Data fetching

| Hook                       | Source                            | What it fetches                                              |
| -------------------------- | --------------------------------- | ------------------------------------------------------------ |
| `useMatchesControllerList` | `@/api/generated/matches/matches` | Paginated match list, filtered by sport/venue/date/available |
| `useVenuesControllerList`  | `@/api/generated/venues/venues`   | All venues (limit 100) for the venue dropdown                |

Both hooks are Orval-generated React Query wrappers. `QueryClient` is bootstrapped in `main.tsx`:

```ts
new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1 },
  },
});
```

### Filter state

```ts
type FilterState = {
  sportType?: SportType; // MatchesControllerListSportType enum
  venueId?: string;
  date?: string; // YYYY-MM-DD
  available?: boolean;
  page: number;
  limit: number; // PAGE_SIZE = 12
};
```

Any filter change resets `page` to 1. "Clear filters" resets to `DEFAULT_FILTERS` (`{ page: 1, limit: 12 }`).

### Match card

Each `MatchBrowseItemDto` renders as a `Card` with:

| Field                  | Display                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `match.title`          | Title (line-clamped to 2 lines)                                   |
| `match.sportType`      | Sport icon (Shield / Swords / Bike / Dumbbell)                    |
| `match.venueName`      | Venue name (muted text)                                           |
| `match.scheduledAt`    | Formatted date + time (`Intl.DateTimeFormat`, locale-aware)       |
| `match.status`         | Badge (open → primary, full → secondary, cancelled → destructive) |
| `match.pricePerPlayer` | Price per player                                                  |
| `match.spotsRemaining` | `booked / total` — amber when ≤ 2 spots left, destructive when 0  |

### Loading state

While `isLoading` is true, 12 `MatchCardSkeleton` cards are shown (pulse animation). While venues load the filter bar shows a plain "Loading..." text — this is a known placeholder, replace with a skeleton when polishing the UI.

### Error state

A destructive alert banner renders when `isError` is true ("Failed to load matches. Please try again."). No retry button yet — the React Query `retry: 1` config handles one automatic retry.

### i18n

All strings live in `player` namespace under `discover.*`:

```
discover.pageTitle
discover.filters.{sport,allSports,venue,allVenues,date,availableOnly,clearFilters}
discover.sports.{football,padel,cricket,generic}
discover.card.{spotsRemaining,pricePerPlayer}
discover.status.{open,full,cancelled,completed,in_progress}
discover.empty.{title,description}
discover.pagination.{previous,next,page}
```

Translated in `src/i18n/en/player.json` and `src/i18n/ar/player.json`.

---

## 4. Route guard chain

```
<ProtectedRoute>              ← checks isAuthenticated + isSessionReady
  <Route index>               ← RoleBasedRouter → Navigate to /home
  <PlayerRoute>               ← checks isPlayerRole(user.role); 403 otherwise
    <PlayerLayout>            ← AppBar + sidebar + bottom nav
      <Route path="home">        ← DiscoverPage
      <Route path="matches/:id"> ← MatchDetailPage (booking + cancel flow)
      <Route path="bookings">    ← (page not yet implemented, route exists)
      <Route path="wallet">      ← (coming soon)
      <Route path="profile">     ← (coming soon)
```

`PlayerRoute` renders `<Navigate to="/403" />` for any non-player role — layout never mounts for unauthorised users.

---

## 5. File index

| Concern         | File                                             |
| --------------- | ------------------------------------------------ |
| Player shell    | `src/shared/layouts/PlayerLayout.tsx`            |
| App bar         | `src/shared/components/AppBar.tsx`               |
| Role → home URL | `src/features/auth/utils.ts` (`getRoleHomePath`) |
| Index redirect  | `src/routes/RoleBasedRouter.tsx`                 |
| Player guard    | `src/routes/guards/PlayerRoute.tsx`              |
| Discover page   | `src/features/player/pages/DiscoverPage.tsx`     |
| Player barrel   | `src/features/player/index.ts`                   |
| Booking flow    | `docs/booking-flow.md`                           |
| i18n (EN)       | `src/i18n/en/player.json`                        |
| i18n (AR)       | `src/i18n/ar/player.json`                        |
| Query client    | `src/main.tsx` (`QueryClientProvider`)           |

---

## 6. Known gaps / follow-up tickets

| Gap                        | Notes                                                                           |
| -------------------------- | ------------------------------------------------------------------------------- |
| Venues loading state       | `FilterBar` shows plain "Loading..." while venues fetch — replace with skeleton |
| `console.log` in FilterBar | Line 159 of `DiscoverPage.tsx` — remove before merge to main                    |
| Booking flow               | Create + cancel booking implemented — see `docs/booking-flow.md`                |
| My Bookings page           | `/bookings` route exists but page component not yet implemented                 |
| Wallet API                 | `user.walletBalance` always `null` until wallet service ships                   |
| Notification bell          | Placeholder only — no badge, no panel                                           |
| Error i18n                 | "Failed to load matches" string is hardcoded in EN — add to `player.json`       |
