import { cn } from '@/lib/utils';

import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  className?: string;
};

/** Fixed top-end corner controls used on full-page layouts (auth pages, etc.). */
export function PageControls({ className }: Props) {
  return (
    <div
      className={cn(
        'fixed top-4 inset-e-4 z-50 flex items-center gap-2',
        className,
      )}
    >
      <ThemeToggle />
      <LocaleSwitcher />
    </div>
  );
}
