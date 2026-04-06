import { useLayoutEffect } from 'react';

import { useLocaleStore } from '@/stores/localeStore';

/**
 * Keeps <html lang> and <html dir> in sync with the locale store (LTR / RTL).
 */
export function HtmlLangDir() {
  const locale = useLocaleStore((s) => s.locale);

  useLayoutEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }, [locale]);

  return null;
}
