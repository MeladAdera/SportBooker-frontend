import {
  Building2,
  LayoutDashboard,
  Menu,
  Settings,
  Swords,
  User,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink, Outlet, useLocation } from 'react-router-dom';

import { AppBar } from '@/shared/components/AppBar';
import { cn } from '@/lib/utils';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';

type NavItem = {
  to: string;
  labelKey: string;
  icon: React.ElementType;
  /** When true, item is hidden unless role === 'super_admin' */
  superAdminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    to: '/operator/dashboard',
    labelKey: 'nav.dashboard',
    icon: LayoutDashboard,
  },
  { to: '/operator/matches', labelKey: 'nav.matches', icon: Swords },
  { to: '/operator/venues', labelKey: 'nav.venues', icon: Building2 },
  { to: '/operator/players', labelKey: 'nav.players', icon: Users },
  {
    to: '/operator/settings',
    labelKey: 'nav.tenantSettings',
    icon: Settings,
    superAdminOnly: true,
  },
  { to: '/operator/profile', labelKey: 'nav.profile', icon: User },
];

type NavItemProps = {
  item: NavItem;
  onClick?: () => void;
};

function OperatorNavItem({ item, onClick }: NavItemProps) {
  const { t } = useTranslation('operator');
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
          isActive
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
        )
      }
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <span className="flex-1">{t(item.labelKey)}</span>
    </NavLink>
  );
}

type Props = {
  children?: React.ReactNode;
};

export function OperatorLayout({ children }: Props) {
  const role = useAuthStore((s) => s.user?.role ?? '');
  const isSuperAdmin = normalizeRole(role) === 'super_admin';
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.superAdminOnly || isSuperAdmin,
  );

  // Close drawer on route change — deferred to avoid setState-in-effect lint error
  useEffect(() => {
    const id = setTimeout(() => setDrawerOpen(false), 0);
    return () => clearTimeout(id);
  }, [location.pathname]);

  // Close on Escape key
  useEffect(() => {
    if (!drawerOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  // Trap focus inside drawer when open
  useEffect(() => {
    if (drawerOpen) {
      drawerRef.current?.focus();
    }
  }, [drawerOpen]);

  // Prevent body scroll while drawer is open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerOpen]);

  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── AppBar — full width ──────────────────────────────────── */}
      <AppBar profilePath="/operator/profile" />

      {/* ── Below AppBar: sidebar + content ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Desktop sidebar ───────────────────────────────────── */}
        <aside
          className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar lg:w-64"
          aria-label="Main navigation"
        >
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
            aria-label="Main navigation"
          >
            {visibleItems.map((item) => (
              <OperatorNavItem key={item.to} item={item} />
            ))}
          </nav>
        </aside>

        {/* ── Mobile hamburger bar ──────────────────────────────── */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex h-12 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
            <button
              type="button"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="operator-drawer"
              onClick={() => setDrawerOpen(true)}
              className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
            >
              <Menu className="h-5 w-5" aria-hidden />
            </button>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
              Menu
            </span>
          </header>

          {/* ── Main content ──────────────────────────────────────── */}
          <main className="flex flex-1 flex-col overflow-y-auto">
            {children ?? <Outlet />}
          </main>
        </div>
      </div>

      {/* ── Mobile drawer overlay ───────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          aria-hidden
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ─────────────────────────────────── */}
      <div
        id="operator-drawer"
        ref={drawerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={cn(
          'fixed inset-y-0 inset-s-0 z-50 flex w-64 flex-col bg-sidebar shadow-xl transition-transform duration-300 ease-in-out md:hidden',
          'focus-visible:outline-none',
          drawerOpen ? 'translate-x-0' : '-translate-x-full',
          'rtl:translate-x-full rtl:data-[open=true]:translate-x-0',
        )}
        data-open={drawerOpen}
      >
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <span className="text-base font-semibold tracking-tight text-sidebar-foreground">
            SportBooker
          </span>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setDrawerOpen(false)}
            className="rounded-md p-1.5 text-sidebar-foreground transition-colors hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
          aria-label="Main navigation"
        >
          {visibleItems.map((item) => (
            <OperatorNavItem
              key={item.to}
              item={item}
              onClick={() => setDrawerOpen(false)}
            />
          ))}
        </nav>
      </div>
    </div>
  );
}
