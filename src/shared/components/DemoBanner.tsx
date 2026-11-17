import { useTranslation } from 'react-i18next';
import { FlaskConical } from 'lucide-react';

import { isDemoMode } from '@/lib/demo';

/** Thin notice shown on every page when the app runs as a public demo. */
export function DemoBanner() {
  const { t } = useTranslation('common');
  if (!isDemoMode()) return null;

  return (
    <div
      role="note"
      className="flex items-center justify-center gap-2 border-b border-amber-300/60 bg-amber-50 px-4 py-1.5 text-center text-xs font-medium text-amber-800 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300"
    >
      <FlaskConical className="size-3.5 shrink-0" aria-hidden />
      <span>{t('demoBanner')}</span>
    </div>
  );
}
