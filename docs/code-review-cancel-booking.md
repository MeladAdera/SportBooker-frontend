# Code review — cancel booking feature

Files reviewed:

- `src/features/player/components/CancelBookingModal.tsx`
- `src/features/player/pages/MatchDetailPage.tsx` (`BookingCta` section)

---

## 🔴 Bug — `onError` never fires (critical)

**File:** `CancelBookingModal.tsx` — lines 255–261, and `isCutoffError` helper (lines 29–35)

### What's wrong

`isCutoffError` checks for `error.response?.status === 422`, expecting the error to be an Axios-style thrown exception with a `response` object. But the Orval-generated `bookingsControllerCancelMyBooking` (`src/api/generated/bookings/bookings.ts`, line 100) **never throws**. It always resolves:

```ts
return {
  data,
  status: res.status,
  headers: res.headers,
} as bookingsControllerCancelMyBookingResponse;
```

The underlying `apiFetch` (`src/api/client.ts`) is a plain `fetch` wrapper that also never throws on 4xx/5xx — it returns the raw `Response`. TanStack Query's `onError` callback only fires when the mutation function **throws or rejects**. Since this function always resolves, `onError` is dead code.

### Consequence

- A 422 cutoff error silently calls `onSuccess` with `{ data, status: 422 }`.
- Cache is invalidated (the match re-fetches — no visual change).
- The modal advances to the `'success'` step even though the cancellation failed.
- The user sees "Booking Cancelled" on a failed cancel. This is the worst possible outcome for a money-sensitive action.

### Fix

Move the error branch into `onSuccess`, where the resolved response actually lands:

```ts
onSuccess: (res) => {
  if (res.status === 200) {
    void qc.invalidateQueries({ queryKey: getMatchesControllerGetByIdQueryKey(matchId) });
    void qc.invalidateQueries({ queryKey: getUsersControllerListMyBookingsQueryKey() });
    setErrorMsg(null);
    setStep('success');
  } else {
    setErrorMsg(
      res.status === 422
        ? t('cancelBooking.error.cutoffWindow')
        : t('cancelBooking.error.generic'),
    );
  }
},
onError: () => {
  // Only fires on network-level failure (fetch throws)
  setErrorMsg(t('cancelBooking.error.generic'));
},
```

The `isCutoffError` helper and its cast `(error as { response?: { status?: number } })` can then be deleted entirely.

> This same pattern already exists correctly in `BookingModal.tsx` (line 232: `if (res.status === 201)`). The cancel modal should mirror it.

---

## 🟠 Issue — `CancelBookingModal` mounted inside every render of `BookingCta` (remount on re-render)

**File:** `MatchDetailPage.tsx` — lines 221–228 and 246–253

### What's wrong

`CancelBookingModal` is rendered _inside_ the JSX return of `BookingCta`, conditionally on `myBooking && myBookingId`. This means:

1. Every time `BookingCta` re-renders (e.g. React Query background refetch), the modal unmounts and remounts, resetting its internal state (`step`, `errorMsg`, `cancelBooking` mutation).
2. If a background refetch happens while the modal is open and pending, the mutation resets mid-flight — the loading state disappears and the user can click again.
3. The guard `{myBooking && myBookingId && <CancelBookingModal ... />}` is partially redundant — we only reach the `confirmed` and `waitlisted` branches when `myBooking` is defined anyway.

### Fix

Move `cancelOpen` state and `<CancelBookingModal />` up to `MatchDetailPage` level, exactly like `bookingOpen` and `<BookingModal />`:

```tsx
// In MatchDetailPage
const [cancelOpen, setCancelOpen] = useState(false);

// Pass down to BookingCta
<BookingCta
  match={match}
  myBooking={myBookingForThisMatch}
  myBookingId={myBookingId}
  onBook={() => setBookingOpen(true)}
  onCancel={() => setCancelOpen(true)}
/>;

// Render alongside BookingModal — stable, always mounted when data exists
{
  myBookingForThisMatch && myBookingId && (
    <CancelBookingModal
      matchId={match.id}
      myBooking={{ ...myBookingForThisMatch, id: myBookingId }}
      open={cancelOpen}
      onOpenChange={setCancelOpen}
    />
  );
}
```

`BookingCta` becomes fully stateless (no `useState`) — just a display component that calls callbacks.

---

## 🟠 Issue — `paidAmount` falls back to `0` silently

**File:** `CancelBookingModal.tsx` — line 241

```ts
const paidAmount = parseFloat(myBooking.paidAmount ?? '0');
```

`myBooking.paidAmount` is typed as `string` on `MyBookingItemDto`. The `?? '0'` fallback means if it's `undefined` or missing, the forfeit amount displays as `0` and the refund notice says "Your 0 will be refunded". This is misleading — the player sees no money at stake.

### Fix

If `paidAmount` is `NaN` or `0`, show a dash or hide the amount row rather than rendering `0`:

```ts
const paidAmount = parseFloat(myBooking.paidAmount ?? '');
const hasPaidAmount = !isNaN(paidAmount) && paidAmount > 0;
```

Then in the forfeit row and refund notice, gate on `hasPaidAmount`. If false, show `—` instead.

---

## 🟡 Issue — `ConfirmedCancelProps` and `WaitlistCancelProps` are identical types

**File:** `CancelBookingModal.tsx` — lines 81–87 and 159–165

Both prop types have the exact same shape:

```ts
type ConfirmedCancelProps = {
  paidAmount: number;
  isPending: boolean;
  errorMsg: string | null;
  onConfirm: () => void;
  onGoBack: () => void;
};

type WaitlistCancelProps = {
  /* identical */
};
```

DRY violation. One shared type is enough:

```ts
type CancelBodyProps = {
  paidAmount: number;
  isPending: boolean;
  errorMsg: string | null;
  onConfirm: () => void;
  onGoBack: () => void;
};
```

---

## 🟡 Issue — `matchDetail.cta.cancelling` key used in `CancelBookingModal`

**File:** `CancelBookingModal.tsx` — lines 149 and 208

```ts
t('matchDetail.cta.cancelling');
```

This key lives under `matchDetail.cta` which is semantically about the CTA state on the match page, not the modal. The modal should use its own key. Add `cancelBooking.cancelling` to both JSON files:

```json
"cancelBooking": {
  "cancelling": "Cancelling…"
}
```

```json
"cancelBooking": {
  "cancelling": "جارٍ الإلغاء…"
}
```

Then replace both occurrences in the modal. Low priority, but important for i18n maintainability — the `matchDetail.cta.cancelling` key could be rephrased or removed later and break the modal silently.

---

## 🟡 Issue — `gap-0` on the page root div is noise

**File:** `MatchDetailPage.tsx` — line 367

```tsx
<div className="flex flex-col gap-0">
```

`gap-0` is the default. This is a no-op class. Remove it.

---

## 🟡 Issue — `SPORT_ICONS` maps football/padel/cricket all to `Shield`

**File:** `MatchDetailPage.tsx` — lines 65–70

```ts
const SPORT_ICONS: Record<string, React.ElementType> = {
  football: Shield,
  padel: Shield,
  cricket: Shield,
  generic: Dumbbell,
};
```

All three sports use `Shield`. This is likely a placeholder — the comment in the original code referred to `Swords`, `Bike`, etc. Not a bug, but a known gap worth tracking. Leave a `// TODO` comment or link to the ticket.

---

## 🟢 Things that are correct

- `showCloseButton={!cancelBooking.isPending && step !== 'success'}` — correctly locks the modal during pending and hides the X on success.
- `handleClose` guards `cancelBooking.isPending` — prevents accidental dismiss mid-mutation.
- `setTimeout(() => { ... }, 150)` on reset — matches the dialog exit animation duration, same pattern as `BookingModal`.
- `handleSuccessClose` navigates to `/bookings` — correct post-cancel destination.
- Both confirmed and waitlist branches guard on `myBooking && myBookingId` before rendering the modal — prevents rendering with missing data.
- `onOpenChange={(v) => !v && handleClose()}` — correctly intercepts backdrop/escape close.
- `role="alert"` on error banners — accessible.
- `aria-hidden` on all decorative icons — correct.
- `ps-6` for the no-refund body (logical padding-start, RTL-safe) — correct.
- `tabular-nums` on money values — correct.
- Cache invalidation on both match and bookings queries — complete.

---

## Summary table

| Severity | Issue                                                                 | File                     | Lines            |
| -------- | --------------------------------------------------------------------- | ------------------------ | ---------------- |
| 🔴 Bug   | `onError` never fires — 422 treated as success                        | `CancelBookingModal.tsx` | 243–263, 29–35   |
| 🟠 Issue | Modal remounts on every `BookingCta` re-render                        | `MatchDetailPage.tsx`    | 221–228, 246–253 |
| 🟠 Issue | `paidAmount` silently falls back to `0`                               | `CancelBookingModal.tsx` | 241              |
| 🟡 Issue | Duplicate prop types (`ConfirmedCancelProps` / `WaitlistCancelProps`) | `CancelBookingModal.tsx` | 81–87, 159–165   |
| 🟡 Issue | i18n key `matchDetail.cta.cancelling` used in wrong namespace         | `CancelBookingModal.tsx` | 149, 208         |
| 🟡 Noise | `gap-0` is a no-op class                                              | `MatchDetailPage.tsx`    | 367              |
| 🟡 Note  | `SPORT_ICONS` maps all sports to `Shield` (placeholder)               | `MatchDetailPage.tsx`    | 65–70            |
