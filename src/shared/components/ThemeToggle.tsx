import { Moon, Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { useThemeStore } from '@/stores/themeStore';

type Props = {
  className?: string;
};

export function ThemeToggle({ className }: Props) {
  const { t } = useTranslation('common');
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);

  return (
    <button
      type="button"
      aria-label={
        theme === 'dark' ? t('theme.toggleLight') : t('theme.toggleDark')
      }
      onClick={toggleTheme}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-full',
        'border border-border/60 bg-background/80 text-foreground/70 shadow-sm backdrop-blur-sm',
        'transition-colors hover:bg-accent/20 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {theme === 'dark' ? (
        <Sun className="h-4 w-4" aria-hidden />
      ) : (
        <Moon className="h-4 w-4" aria-hidden />
      )}
    </button>
  );
}
