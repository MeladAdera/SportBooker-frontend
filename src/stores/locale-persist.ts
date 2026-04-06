/** Must match `persist.name` in localeStore. */
export const LOCALE_STORAGE_KEY = 'sportbooker-locale';

/** Read Zustand-persisted locale synchronously (same shape as persist middleware). */
export function readPersistedLocale(): 'en' | 'ar' | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { state?: { locale?: string } };
    const l = p.state?.locale;
    if (l === 'en' || l === 'ar') return l;
  } catch {
    return null;
  }
  return null;
}
