import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { cn } from '@/lib/utils';

type Props = {
  className?: string;
  compact?: boolean;
};

export function LegalLinks({ className, compact = false }: Props) {
  const { t } = useTranslation('legal');

  const links = [
    { to: '/legal/privacy', label: t('shared.links.privacy') },
    { to: '/legal/terms', label: t('shared.links.terms') },
    { to: '/legal/disclaimer', label: t('shared.links.disclaimer') },
  ];

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 text-muted-foreground',
        compact ? 'text-[11px]' : 'text-xs',
        className,
      )}
      aria-label="Legal links"
    >
      {links.map((item, index) => (
        <span key={item.to} className="inline-flex items-center gap-1">
          <Link
            to={item.to}
            className="underline-offset-4 transition-colors hover:text-foreground hover:underline"
          >
            {item.label}
          </Link>
          {index < links.length - 1 && (
            <span className="text-muted-foreground/60">-</span>
          )}
        </span>
      ))}
    </div>
  );
}
