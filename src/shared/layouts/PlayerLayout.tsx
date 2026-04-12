import { BookOpen, Home, User, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { AppBar } from '@/shared/components/AppBar';
import { cn } from '@/lib/utils';

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/home', labelKey: 'nav.home', icon: Home },
  { to: '/bookings', labelKey: 'nav.bookings', icon: BookOpen },
  { to: '/wallet', labelKey: 'nav.wallet', icon: Wallet },
  { to: '/profile', labelKey: 'nav.profile', icon: User },
];

type NavItemProps = {
  item: NavItem;
  variant: 'bottom' | 'sidebar';
};

function PlayerNavItem({ item, variant }: NavItemProps) {
  const { t } = useTranslation('player');
  const Icon = item.icon;
  const isBottomNav = variant === 'bottom';

  return (
    <NavLink
      to={item.to}
      end={item.to === '/'}
      className={({ isActive }) =>
        cn(
          'group flex items-center justify-center gap-3 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isBottomNav
            ? 'flex-col gap-0.5 px-2 py-1.5 text-[11px]'
            : 'w-full px-3 py-2.5 text-sm',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )
      }
    >
      <Icon
        className={cn('shrink-0', isBottomNav ? 'h-5 w-5' : 'h-4 w-4')}
        aria-hidden
      />
      <span className={cn(isBottomNav ? 'leading-tight' : 'flex-1')}>
        {t(item.labelKey)}
      </span>
    </NavLink>
  );
}

type Props = {
  children?: React.ReactNode;
};

export function PlayerLayout({ children }: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── AppBar — full width ──────────────────────────────────── */}
      <AppBar profilePath="/profile" />

      {/* ── Below AppBar: sidebar + content ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden md:flex-row">
        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <aside
          className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar lg:w-64"
          aria-label="Main navigation"
        >
          <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
            {NAV_ITEMS.map((item) => (
              <PlayerNavItem key={item.to} item={item} variant="sidebar" />
            ))}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          {children ?? <Outlet />}
        </main>
      </div>

      {/* ── Mobile bottom nav ───────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar shadow-md md:hidden"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <div key={item.to} className="flex flex-1 items-stretch">
            <PlayerNavItem item={item} variant="bottom" />
          </div>
        ))}
      </nav>
    </div>
  );
}
