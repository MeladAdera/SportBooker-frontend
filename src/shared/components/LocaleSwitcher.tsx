import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { useLocaleStore, type Locale } from '@/stores/localeStore';

type Props = {
  className?: string;
};

export function LocaleSwitcher({ className }: Props) {
  const { t } = useTranslation('common');
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const item = (code: Locale, short: string, full: string) => (
    <Button
      type="button"
      size="sm"
      variant={locale === code ? 'default' : 'outline'}
      className="min-w-14 px-2"
      onClick={() => setLocale(code)}
      aria-pressed={locale === code}
      aria-label={t('locale.switchTo', { lang: full })}
    >
      {short}
    </Button>
  );

  return (
    <div className={className} role="group" aria-label={t('locale.groupLabel')}>
      <div className="inline-flex gap-1 rounded-lg border border-border bg-card/80 p-0.5 shadow-sm backdrop-blur-sm">
        {item('en', t('locale.en'), t('locale.enFull'))}
        {item('ar', t('locale.ar'), t('locale.arFull'))}
      </div>
    </div>
  );
}
