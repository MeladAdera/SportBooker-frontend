import { Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useLocaleStore, type Locale } from '@/stores/localeStore';

type Props = {
  className?: string;
};

export function LocaleSwitcher({ className }: Props) {
  const { t } = useTranslation('common');
  const locale = useLocaleStore((s) => s.locale);
  const setLocale = useLocaleStore((s) => s.setLocale);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={t('locale.groupLabel')}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-full',
          'border border-border/60 bg-background/80 text-foreground/70 shadow-sm backdrop-blur-sm',
          'transition-colors hover:bg-accent/20 hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          className,
        )}
      >
        <Languages className="h-4 w-4" aria-hidden />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuRadioGroup
          value={locale}
          onValueChange={(v) => setLocale(v as Locale)}
        >
          <DropdownMenuRadioItem value="en">
            {t('locale.enFull')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="ar">
            {t('locale.arFull')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
