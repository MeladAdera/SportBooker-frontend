import { cn } from '@/lib/utils';

type Props = {
  /** Display name shown when there's no logo URL. */
  name: string;
  /** Optional logo URL. When null, falls back to an initials tile. */
  logoUrl: string | null;
  /** Tailwind size classes (default `h-12 w-12`). */
  className?: string;
  /** Optional override for the rounded corners (default `rounded-2xl`). */
  rounded?: string;
};

/**
 * Tenant logo or initials fallback. Mirrors the pattern used in
 * `src/shared/components/AppBar.tsx` so tenant identity stays visually
 * consistent across the landing page, login screen, and authed shell.
 */
export function BrandLogo({
  name,
  logoUrl,
  className,
  rounded = 'rounded-2xl',
}: Props) {
  const initial = name.trim().charAt(0).toUpperCase() || 'S';

  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={name}
        loading="eager"
        decoding="async"
        className={cn(
          'shrink-0 object-cover ring-1 ring-foreground/10',
          rounded,
          className,
        )}
      />
    );
  }

  return (
    <div
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center bg-primary text-primary-foreground ring-1 ring-foreground/10',
        rounded,
        className,
      )}
    >
      <span className="text-[1.5em] font-bold leading-none">{initial}</span>
    </div>
  );
}
