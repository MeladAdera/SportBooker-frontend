export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'AED',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Timezone-aware date utilities ─────────────────────────────────────────────

/**
 * Returns the UTC offset for a timezone at a given moment, in minutes.
 * Positive = ahead of UTC (e.g. UTC+4 → 240).
 */
function getTzOffsetMinutes(date: Date, tz: string): number {
  const fmt = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? '0');
  // Midnight-hour quirk: some engines emit "24" for hour12:false at midnight
  const localAsUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24,
    get('minute'),
    get('second'),
  );
  return (localAsUtc - date.getTime()) / 60_000;
}

/**
 * Builds an ISO-8601 timestamp with an explicit UTC offset so the backend
 * always knows the wall-clock time the operator intended.
 *
 * e.g. toZonedISO(new Date('2026-04-16'), '23:00', 'Asia/Dubai')
 *      → '2026-04-16T23:00:00+04:00'
 */
export function toZonedISO(localDate: Date, time: string, tz: string): string {
  const [h, m] = time.split(':').map(Number);
  const y = localDate.getFullYear();
  const month = localDate.getMonth();
  const day = localDate.getDate();

  // Approximate: treat wall-clock as UTC, then correct by real offset (handles DST)
  const approx = new Date(Date.UTC(y, month, day, h, m, 0));
  const offsetMins = getTzOffsetMinutes(approx, tz);
  const actualUtc = new Date(approx.getTime() - offsetMins * 60_000);
  const finalOffset = getTzOffsetMinutes(actualUtc, tz);

  const mo = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  const hStr = String(h).padStart(2, '0');
  const mStr = String(m).padStart(2, '0');
  const sign = finalOffset >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(finalOffset));
  const offH = String(Math.floor(abs / 60)).padStart(2, '0');
  const offM = String(abs % 60).padStart(2, '0');

  return `${y}-${mo}-${d}T${hStr}:${mStr}:00${sign}${offH}:${offM}`;
}

/**
 * Extracts YYYY-MM-DD from a Date using the browser's local timezone.
 * Use this when the user picks a calendar day and you need to send that
 * exact calendar date as a query param (e.g. dateFrom/dateTo/date filters).
 */
export function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Formats a UTC ISO string for display using the given IANA timezone.
 * Falls back to the raw string on parse error.
 */
export function formatDateInTz(
  iso: string,
  tz: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  },
): string {
  try {
    return new Intl.DateTimeFormat(undefined, { timeZone: tz, ...opts }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

/**
 * Formats a UTC ISO string to HH:MM in the given timezone.
 */
export function formatTimeInTz(iso: string, tz: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}
