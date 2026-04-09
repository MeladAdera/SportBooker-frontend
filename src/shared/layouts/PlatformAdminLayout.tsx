import { Building2, User } from 'lucide-react';
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
  { to: '/admin/tenants', labelKey: 'nav.tenants', icon: Building2 },
  { to: '/admin/profile', labelKey: 'nav.account', icon: User },
];

function AdminNavItem({ item }: { item: NavItem }) {
  const { t } = useTranslation('admin');
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
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

export function PlatformAdminLayout({ children }: Props) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      {/* ── AppBar — full width ──────────────────────────────────── */}
      <AppBar isPlatform profilePath="/admin/profile" />

      {/* ── Below AppBar: sidebar + content ─────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* ── Sidebar ───────────────────────────────────────────── */}
        <aside
          className="flex w-56 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:w-64"
          aria-label="Platform admin navigation"
        >
          <nav
            className="flex flex-1 flex-col gap-1 overflow-y-auto p-3"
            aria-label="Platform admin navigation"
          >
            {NAV_ITEMS.map((item) => (
              <AdminNavItem key={item.to} item={item} />
            ))}
          </nav>
        </aside>

        {/* ── Main content ──────────────────────────────────────── */}
        <main className="flex flex-1 flex-col overflow-y-auto">
          {children ?? <Outlet />}
        </main>
      </div>
    </div>
  );
}
