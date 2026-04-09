import { Bell, LogOut, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';

type BrandingProps = {
  /** When true, shows platform wordmark instead of tenant branding */
  isPlatform?: boolean;
};

function Branding({ isPlatform = false }: BrandingProps) {
  const tenantInfo = useTenantStore((s) => s.tenantInfo);
  const slug = useTenantStore((s) => s.slug);

  if (isPlatform) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
          PA
        </div>
        <span className="text-sm font-semibold text-foreground">
          SportBooker Platform
        </span>
      </div>
    );
  }

  const name =
    tenantInfo?.name ??
    (slug && slug !== 'platform' ? slug.toUpperCase() : 'SportBooker');
  const logoUrl = tenantInfo?.logoUrl ?? null;

  return (
    <div className="flex items-center gap-2">
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name}
          className="h-7 w-7 shrink-0 rounded-md object-cover ring-1 ring-foreground/10"
        />
      ) : (
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground ring-1 ring-foreground/10">
          {name.charAt(0).toUpperCase()}
        </div>
      )}
      <span className="text-sm font-semibold text-foreground">{name}</span>
    </div>
  );
}

function UserAvatar() {
  const user = useAuthStore((s) => s.user);
  const name = user?.name ?? '';
  const photoUrl = user?.photoUrl ?? null;

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="h-8 w-8 rounded-full object-cover ring-2 ring-border"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground ring-2 ring-border">
      {initials || <User className="h-4 w-4" aria-hidden />}
    </div>
  );
}

type Props = {
  isPlatform?: boolean;
  profilePath?: string;
  className?: string;
};

export function AppBar({ isPlatform = false, profilePath, className }: Props) {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const user = useAuthStore((s) => s.user);

  const resolvedProfilePath =
    profilePath ?? (isPlatform ? '/admin/profile' : '/profile');

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm',
        className,
      )}
    >
      {/* Left: tenant / platform branding */}
      <Branding isPlatform={isPlatform} />

      {/* Right: notification bell + user menu */}
      <div className="flex items-center gap-2">
        {/* Notification bell — placeholder, no badge yet */}
        <button
          type="button"
          aria-label={t('appBar.notifications')}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-4 w-4" aria-hidden />
        </button>

        {/* User avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label={t('appBar.userMenu')}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <UserAvatar />
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" sideOffset={8} className="min-w-48">
            {user && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium text-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
              </>
            )}

            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate(resolvedProfilePath)}
            >
              <User className="h-4 w-4" aria-hidden />
              {t('appBar.profile')}
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
              onClick={() => void handleLogout()}
            >
              <LogOut className="h-4 w-4" aria-hidden />
              {t('appBar.logout')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
