import { BookOpen, Home, User, Wallet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
};

const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: Home },
  { to: '/bookings', labelKey: 'nav.bookings', icon: BookOpen },
  { to: '/wallet', labelKey: 'nav.wallet', icon: Wallet },
  { to: '/profile', labelKey: 'nav.profile', icon: User },
];

function formatBalance(balance: number | null | undefined): string | null {
  if (balance == null) return null;
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(balance);
}

type NavItemProps = {
  item: NavItem;
  walletBalance: number | null | undefined;
  variant: 'bottom' | 'sidebar';
};

function PlayerNavItem({ item, walletBalance, variant }: NavItemProps) {
  const { t } = useTranslation('player');
  const Icon = item.icon;
  const isWallet = item.to === '/wallet';
  const balance = isWallet ? formatBalance(walletBalance) : null;

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
        {isWallet && balance !== null && (
          <span
            className={cn(
              'block font-normal tabular-nums text-sidebar-primary',
              isBottomNav ? 'text-[10px] leading-tight' : 'text-xs',
            )}
          >
            {balance}
          </span>
        )}
      </span>
    </NavLink>
  );
}

type Props = {
  children?: React.ReactNode;
};

export function PlayerLayout({ children }: Props) {
  const walletBalance = useAuthStore((s) => s.user?.walletBalance);

  return (
    <div className="flex min-h-svh flex-col bg-background md:flex-row">
      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside
        className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar lg:w-64"
        aria-label="Main navigation"
      >
        {/* Logo / brand area */}
        <div className="flex h-14 items-center border-b border-sidebar-border px-4">
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
            SportBooker
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {NAV_ITEMS.map((item) => (
            <PlayerNavItem
              key={item.to}
              item={item}
              walletBalance={walletBalance}
              variant="sidebar"
            />
          ))}
        </nav>
      </aside>

      {/* ── Main content ────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
        {children ?? <Outlet />}
      </main>

      {/* ── Mobile bottom nav ───────────────────────────────────── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar shadow-md md:hidden"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => (
          <div key={item.to} className="flex flex-1 items-stretch">
            <PlayerNavItem
              item={item}
              walletBalance={walletBalance}
              variant="bottom"
            />
          </div>
        ))}
      </nav>
    </div>
  );
}
