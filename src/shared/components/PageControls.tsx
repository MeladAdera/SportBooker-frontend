import { cn } from '@/lib/utils';

import { LegalLinks } from './LegalLinks';
import { LocaleSwitcher } from './LocaleSwitcher';
import { ThemeToggle } from './ThemeToggle';

type Props = {
  className?: string;
};

/** Full-width top bar — first row inside a `flex min-h-svh flex-col` shell (auth, error pages). */
export function PageControls({ className }: Props) {
  return (
    <div
      className={cn(
        'flex w-full shrink-0 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur-sm',
        className,
      )}
    >
      <LegalLinks compact />
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <LocaleSwitcher />
      </div>
    </div>
  );
}
