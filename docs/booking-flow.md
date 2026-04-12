# Booking flow

This document covers the full booking lifecycle for a player: discovering a match, booking a spot (confirmed or waitlist), and cancelling a booking. It is the authoritative reference for all booking-related components, API calls, state, and i18n.

---

## 1. Overview

```
DiscoverPage (/home)
  → MatchDetailPage (/matches/:id)
      → BookingCta            ← determines which action to show
          → BookingModal      ← create booking (confirmed or waitlist)
          → CancelBookingModal← cancel confirmed booking or leave waitlist
```

---

## 2. Match detail page (`/matches/:id`)

**Source:** `src/features/player/pages/MatchDetailPage.tsx`

### Data fetching

| Hook                                                               | Endpoint                 | Purpose                                                                                   |
| ------------------------------------------------------------------ | ------------------------ | ----------------------------------------------------------------------------------------- |
| `useMatchesControllerGetById(id)`                                  | `GET /matches/:id`       | Full match detail including roster, capacity, price                                       |
| `useUsersControllerListMyBookings({ upcoming: true, limit: 100 })` | `GET /users/me/bookings` | Player's upcoming bookings — used to detect if they already have a booking for this match |

### Detecting the player's booking for this match

`MyBookingItemDto` does not expose a `matchId`. The page uses two fallback heuristics:

- **Confirmed booking:** player appears in `match.roster` (confirmed players only). The matching `MyBookingItemDto` is found by `matchTitle + status === 'confirmed'`.
- **Waitlist booking:** matched by `matchTitle + status === 'waitlisted'`.

> **Known gap:** this matching is approximate. If a player has two bookings for matches with the same title, the wrong booking ID could be used. The backend should expose `matchId` on `MyBookingItemDto` to make this exact.

### Layout

```
MatchDetailPage
├── HeroSkeleton / Hero image (venue photo or gradient)
├── DetailSkeleton / Body
│   ├── Match info card (venue, address, date, time, price)
│   ├── Capacity + GK card (CapacityBar + GkSlots)
│   ├── BookingCta          ← see §3
│   ├── BookingModal        ← see §4
│   └── Roster card (RosterList)
```

### Sub-components

| Component     | Purpose                                                                   |
| ------------- | ------------------------------------------------------------------------- |
| `CapacityBar` | Progress bar: confirmed / maxCapacity. Destructive colour when full.      |
| `GkSlots`     | GK count indicator. Destructive colour when count ≥ `MAX_GK` (2).         |
| `RosterList`  | List of confirmed players with position badge.                            |
| `BookingCta`  | CTA area — decides which action to render based on match + booking state. |

---

## 3. Booking CTA (`BookingCta`)

**Source:** `MatchDetailPage.tsx` (internal component, not exported)

`BookingCta` reads match state and the player's current booking and renders the appropriate action.

### Decision tree

```
match.status === 'cancelled'     → destructive banner "This match has been cancelled"
match is in the past             → null (no CTA)
myBooking.status === 'confirmed' → green badge + "Cancel Booking" button → opens CancelBookingModal
myBooking.status === 'waitlisted'→ secondary badge + "Leave Waitlist" button → opens CancelBookingModal
match.spotsRemaining === 0       → amber waitlist notice + "Join Waitlist" button → opens BookingModal
(default)                        → "Book Now" button → opens BookingModal
```

### Props

```ts
type BookingCtaProps = {
  match: MatchDetailResponseDto;
  myBooking: MyBookingItemDto | undefined;
  myBookingId: string | undefined;
  onBook: () => void; // opens BookingModal (lifted to page)
};
```

`cancelOpen` state is local to `BookingCta` — `CancelBookingModal` is mounted and unmounted inside the component.

---

## 4. Booking modal (`BookingModal`)

**Source:** `src/features/player/components/BookingModal.tsx`

Opens when the player clicks **Book Now** or **Join Waitlist**.

### Steps

```
'form'      → position selector + wallet check + confirm button
'confirmed' → SuccessScreen (confirmed booking)
'waitlist'  → SuccessScreen (waitlist / pending booking)
```

### Step: `form`

| Element                    | Detail                                                                                            |
| -------------------------- | ------------------------------------------------------------------------------------------------- |
| Position selector          | Radio-style buttons: Field Player / Goalkeeper. GK disabled when `gkCount ≥ MAX_GK`.              |
| GK availability            | `{taken} / {max} GK spots taken`                                                                  |
| Price + wallet row         | Price per player + current wallet balance. Balance shown in destructive colour when insufficient. |
| Insufficient funds warning | Destructive banner. Confirm button is disabled.                                                   |
| API error                  | Inline destructive banner below wallet row.                                                       |
| Footer                     | "Cancel" (outline) + "Confirm Booking" (primary, disabled when pending or insufficient funds)     |

### Step: `confirmed` / `waitlist` (SuccessScreen)

| Booking status       | Icon                 | Copy                                                                        |
| -------------------- | -------------------- | --------------------------------------------------------------------------- |
| `confirmed`          | Green `CheckCircle2` | "Booking confirmed!" + amount charged + estimated balance                   |
| `pending` (waitlist) | Amber `Clock`        | "You're on the waitlist" + amount held + refund promise + estimated balance |

Both states show a **"View My Bookings"** `NavLink` → `/bookings`.

### API

```
POST /matches/{matchId}/bookings
Body: { position: 'field_player' | 'goalkeeper' }
201 response: CreateBookingResponseDto
  .status: 'confirmed' | 'pending'
  .paidAmount: string
```

On success: invalidates `matchesControllerGetById` + `usersControllerListMyBookings` query caches.

### Close behaviour

- Close is blocked while mutation is pending (`showCloseButton={false}`, `onOpenChange` guarded).
- After close: state resets after 150 ms to allow the exit animation to complete.

---

## 5. Cancel booking modal (`CancelBookingModal`)

**Source:** `src/features/player/components/CancelBookingModal.tsx`

Opens when the player clicks **Cancel Booking** (confirmed) or **Leave Waitlist** (waitlisted).

### Steps

```
'confirm' → ConfirmedCancelBody or WaitlistCancelBody (based on myBooking.status)
'success' → SuccessScreen
```

### Step: `confirm` — confirmed booking path

| Element                  | Detail                                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Title                    | "Cancel Booking"                                                                                                                 |
| No-refund warning banner | Destructive red. Heading: "You will NOT receive a refund." Body: "Cancelling a confirmed booking forfeits the full amount paid." |
| Forfeit amount row       | `{paidAmount}` in destructive colour                                                                                             |
| Error banner             | Shown inline; modal stays open so user can read the reason                                                                       |
| Footer                   | "Go Back" (outline) + "Cancel This Booking" (`variant="destructive"`)                                                            |

### Step: `confirm` — waitlist path

| Element       | Detail                                                           |
| ------------- | ---------------------------------------------------------------- |
| Title         | "Leave Waitlist"                                                 |
| Refund notice | Amber banner: "Your {amount} will be refunded to your wallet."   |
| Error banner  | Same as confirmed path                                           |
| Footer        | "Go Back" (outline) + "Leave Waitlist" (primary, neutral colour) |

### Step: `success`

| Booking type   | Copy                                           |
| -------------- | ---------------------------------------------- |
| Was confirmed  | "No refund was issued."                        |
| Was waitlisted | "{{amount}} has been refunded to your wallet." |

Close button → calls `navigate('/bookings')`.

### Error handling

| HTTP status | Error shown                                                                                     |
| ----------- | ----------------------------------------------------------------------------------------------- |
| 422         | `cancelBooking.error.cutoffWindow` — "Cancellations are not allowed this close to match start." |
| Any other   | `cancelBooking.error.generic` — "Cancellation failed. Please try again."                        |

Detection: `error.response?.status === 422` via `isCutoffError()` helper inside the component.

### API

```
POST /matches/{matchId}/bookings/{bookingId}/cancel
(no body)
```

On success: invalidates `matchesControllerGetById` + `usersControllerListMyBookings` query caches.

### Close behaviour

Identical to `BookingModal`:

- Blocked while pending.
- State resets after 150 ms on close.
- Success close additionally calls `navigate('/bookings')`.

---

## 6. Booking status reference

### `CreateBookingResponseDtoStatus` (create response)

| Value       | Meaning                                               |
| ----------- | ----------------------------------------------------- |
| `confirmed` | Player got a confirmed spot                           |
| `pending`   | Player is on the waitlist (UI labels this "waitlist") |
| `cancelled` | (not returned on create)                              |

### `MyBookingItemDtoStatus` (list items)

| Value        | Meaning              |
| ------------ | -------------------- |
| `confirmed`  | Confirmed spot       |
| `waitlisted` | On the waitlist      |
| `cancelled`  | Previously cancelled |

> The naming asymmetry (`pending` vs `waitlisted`) exists because create and list are separate endpoints with separate DTOs.

---

## 7. i18n

All booking strings live in the `player` namespace.

### Key map

```
booking.*                       BookingModal form + success screens
cancelBooking.confirmed.*       CancelBookingModal — confirmed path
cancelBooking.waitlist.*        CancelBookingModal — waitlist path
cancelBooking.goBack            Shared "Go Back" label
cancelBooking.error.generic     Generic cancel error
cancelBooking.error.cutoffWindow 422 cutoff error
cancelBooking.success.*         Cancel success screen
matchDetail.cta.*               BookingCta labels + legacy cancel error key
```

**Files:**

- `src/i18n/en/player.json`
- `src/i18n/ar/player.json`

Both files are complete and in sync.

---

## 8. Cache invalidation pattern

Both `BookingModal` and `CancelBookingModal` invalidate the same two queries on mutation success:

```ts
qc.invalidateQueries({
  queryKey: getMatchesControllerGetByIdQueryKey(matchId),
});
qc.invalidateQueries({ queryKey: getUsersControllerListMyBookingsQueryKey() });
```

This keeps the match detail page (roster, capacity, CTA state) and the bookings list in sync without a full page reload.

---

## 9. File index

| Concern                 | File                                                       |
| ----------------------- | ---------------------------------------------------------- |
| Match detail page       | `src/features/player/pages/MatchDetailPage.tsx`            |
| Create booking modal    | `src/features/player/components/BookingModal.tsx`          |
| Cancel booking modal    | `src/features/player/components/CancelBookingModal.tsx`    |
| GK cap constant         | `src/features/player/constants.ts` (`MAX_GK = 2`)          |
| Booking API hooks       | `src/api/generated/bookings/bookings.ts`                   |
| Match API hooks         | `src/api/generated/matches/matches.ts`                     |
| User/bookings list hook | `src/api/generated/users/users.ts`                         |
| Booking DTOs            | `src/api/generated/models/createBookingDto.ts`             |
|                         | `src/api/generated/models/createBookingResponseDto.ts`     |
|                         | `src/api/generated/models/myBookingItemDto.ts`             |
|                         | `src/api/generated/models/bookingPosition.ts`              |
| i18n (EN)               | `src/i18n/en/player.json` → `booking.*`, `cancelBooking.*` |
| i18n (AR)               | `src/i18n/ar/player.json` → `booking.*`, `cancelBooking.*` |

---

## 10. Known gaps / follow-up tickets

| Gap                                | Notes                                                                                                                                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| No `matchId` on `MyBookingItemDto` | Booking detection by title match is approximate — request field from backend                                                                                                                                |
| No toast system                    | Cancel/booking success uses an in-modal success screen instead of a toast. Add sonner/react-hot-toast to the layout when ready                                                                              |
| `myBookingId` fallback             | If roster confirms a player but no matching `MyBookingItemDto` is found, a synthetic `{ status: 'confirmed' }` stub is used — cancellation button will not render because `myBookingId` will be `undefined` |
| Wallet balance optimistic update   | `BookingModal` shows an optimistic estimated balance using `walletBalance - paidAmount`. `authStore` is not updated — the real balance only refreshes on next login or explicit wallet fetch                |
| My Bookings page (`/bookings`)     | Route exists in `App.tsx` but the page component is not yet implemented                                                                                                                                     |
