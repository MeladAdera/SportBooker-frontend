import { useLocaleStore } from '@/stores/localeStore';

/** Document `dir` for the active locale (`ar` → rtl). */
export function useRTL(): 'rtl' | 'ltr' {
  const locale = useLocaleStore((s) => s.locale);
  return locale === 'ar' ? 'rtl' : 'ltr';
}
