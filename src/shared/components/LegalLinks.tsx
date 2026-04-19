import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  compact?: boolean;
};

const LEGAL_ROUTES = [
  { to: '/legal/privacy', label: 'Privacy' },
  { to: '/legal/terms', label: 'Terms' },
  { to: '/legal/disclaimer', label: 'Disclaimer' },
];

export function LegalLinks({ className, compact = false }: Props) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 text-muted-foreground',
        compact ? 'text-[11px]' : 'text-xs',
        className,
      )}
      aria-label="Legal links"
    >
      {LEGAL_ROUTES.map((item, index) => (
        <span key={item.to} className="inline-flex items-center gap-1">
          <Link
            to={item.to}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {item.label}
          </Link>
          {index < LEGAL_ROUTES.length - 1 && (
            <span className="text-muted-foreground/60">-</span>
          )}
        </span>
      ))}
    </div>
  );
}
