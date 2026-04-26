import { lazy, Suspense, useEffect, useState, type ComponentType } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from 'react-router-dom';

import {
  OperatorRoute,
  PlatformAdminRoute,
  PlayerRoute,
  ProtectedRoute,
} from '@/routes/guards';
import { RootRouter } from '@/routes/RootRouter';
import { OnboardingTour } from '@/shared/components/OnboardingTour';

function lazyNamed<T extends ComponentType<unknown>>(
  importer: () => Promise<Record<string, unknown>>,
  exportName: string,
) {
  return lazy(async () => {
    const mod = await importer();
    return { default: mod[exportName] as T };
  });
}

const ForgotPasswordPage = lazyNamed(
  () => import('@/features/auth/pages/ForgotPasswordPage'),
  'ForgotPasswordPage',
);
const LoginPage = lazyNamed(
  () => import('@/features/auth/pages/LoginPage'),
  'LoginPage',
);
const RegisterPage = lazyNamed(
  () => import('@/features/auth/pages/RegisterPage'),
  'RegisterPage',
);
const ResetPasswordPage = lazyNamed(
  () => import('@/features/auth/pages/ResetPasswordPage'),
  'ResetPasswordPage',
);
const CheckEmailPage = lazyNamed(
  () => import('@/features/auth/pages/CheckEmailPage'),
  'CheckEmailPage',
);
const VerifyEmailPage = lazyNamed(
  () => import('@/features/auth/pages/VerifyEmailPage'),
  'VerifyEmailPage',
);
const PrivacyPolicyPage = lazyNamed(
  () => import('@/features/legal/pages/PrivacyPolicyPage'),
  'PrivacyPolicyPage',
);
const TermsOfServicePage = lazyNamed(
  () => import('@/features/legal/pages/TermsOfServicePage'),
  'TermsOfServicePage',
);
const DisclaimerPage = lazyNamed(
  () => import('@/features/legal/pages/DisclaimerPage'),
  'DisclaimerPage',
);
const DiscoverPage = lazyNamed(
  () => import('@/features/player/pages/DiscoverPage'),
  'DiscoverPage',
);
const MatchDetailPage = lazyNamed(
  () => import('@/features/player/pages/MatchDetailPage'),
  'MatchDetailPage',
);
const MyBookingsPage = lazyNamed(
  () => import('@/features/player/pages/MyBookingsPage'),
  'MyBookingsPage',
);
const WalletPage = lazyNamed(
  () => import('@/features/player/pages/WalletPage'),
  'WalletPage',
);
const ProfilePage = lazyNamed(
  () => import('@/features/player/pages/ProfilePage'),
  'ProfilePage',
);
const TopUpSuccessPage = lazyNamed(
  () => import('@/features/player/pages/TopUpSuccessPage'),
  'TopUpSuccessPage',
);
const TopUpCancelPage = lazyNamed(
  () => import('@/features/player/pages/TopUpCancelPage'),
  'TopUpCancelPage',
);
const TopUpFailurePage = lazyNamed(
  () => import('@/features/player/pages/TopUpFailurePage'),
  'TopUpFailurePage',
);
const DashboardPage = lazyNamed(
  () => import('@/features/operator/pages/DashboardPage'),
  'DashboardPage',
);
const MatchListPage = lazyNamed(
  () => import('@/features/operator/pages/MatchListPage'),
  'MatchListPage',
);
const OperatorMatchDetailPage = lazyNamed(
  () => import('@/features/operator/pages/OperatorMatchDetailPage'),
  'OperatorMatchDetailPage',
);
const CreateMatchPage = lazyNamed(
  () => import('@/features/operator/pages/CreateMatchPage'),
  'CreateMatchPage',
);
const TenantSettingsPage = lazyNamed(
  () => import('@/features/operator/pages/TenantSettingsPage'),
  'TenantSettingsPage',
);
const VenuesPage = lazyNamed(
  () => import('@/features/operator/pages/VenuesPage'),
  'VenuesPage',
);
const VenueDetailPage = lazyNamed(
  () => import('@/features/operator/pages/VenueDetailPage'),
  'VenueDetailPage',
);
const PlayerListPage = lazyNamed(
  () => import('@/features/operator/pages/PlayerListPage'),
  'PlayerListPage',
);
const PlayerDetailPage = lazyNamed(
  () => import('@/features/operator/pages/PlayerDetailPage'),
  'PlayerDetailPage',
);

const EditMatchPage = lazyNamed(
  () => import('@/features/operator/pages/EditMatchPage'),
  'EditMatchPage',
);
const CancelMatchPage = lazyNamed(
  () => import('@/features/operator/pages/CancelMatchPage'),
  'CancelMatchPage',
);

const OperatorProfilePage = lazyNamed(
  () => import('@/features/operator/pages/OperatorProfilePage'),
  'OperatorProfilePage',
);
const AdminTenantsPage = lazyNamed(
  () => import('@/features/admin/pages/TenantsPage'),
  'TenantsPage',
);
const AdminTenantDetailPage = lazyNamed(
  () => import('@/features/admin/pages/TenantDetailPage'),
  'TenantDetailPage',
);
const ForbiddenPage = lazyNamed(
  () => import('@/routes/ForbiddenPage'),
  'ForbiddenPage',
);
const NotFoundPage = lazyNamed(
  () => import('@/routes/NotFoundPage'),
  'NotFoundPage',
);

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
      {title}
    </div>
  );
}

function useIsMobileViewport() {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 767px)').matches
      : false,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const media = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return isMobile;
}

function AppBarSkeleton() {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
      <div className="h-7 w-36 animate-pulse rounded-md bg-muted" />
      <div className="flex items-center gap-2">
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
      </div>
    </header>
  );
}

function PageContentSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="h-8 w-52 animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-full animate-pulse rounded-lg bg-muted md:w-96" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div
            key={idx}
            className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
          >
            <div className="h-36 w-full animate-pulse bg-muted" />
            <div className="flex flex-col gap-3 p-4">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-3 w-40 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlayerFallbackShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppBarSkeleton />
      <div className="flex flex-1 overflow-hidden md:flex-row">
        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar lg:w-64">
          <div className="flex flex-1 flex-col gap-2 p-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-y-auto pb-16 md:pb-0">
          <PageContentSkeleton />
        </main>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-50 flex h-16 items-stretch border-t border-sidebar-border bg-sidebar shadow-md md:hidden">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="flex flex-1 items-center justify-center">
            <div className="h-8 w-12 animate-pulse rounded-md bg-muted" />
          </div>
        ))}
      </nav>
    </div>
  );
}

function OperatorFallbackShell({ isMobile }: { isMobile: boolean }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppBarSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:flex md:w-56 md:shrink-0 md:flex-col md:border-e md:border-sidebar-border md:bg-sidebar lg:w-64">
          <div className="flex flex-1 flex-col gap-2 p-3">
            {Array.from({ length: 7 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </aside>

        <div className="flex flex-1 flex-col overflow-hidden">
          {isMobile && (
            <header className="flex h-12 shrink-0 items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 md:hidden">
              <div className="h-7 w-7 animate-pulse rounded-md bg-muted" />
              <div className="h-4 w-20 animate-pulse rounded bg-muted" />
            </header>
          )}
          <main className="flex flex-1 flex-col overflow-y-auto">
            <PageContentSkeleton />
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminFallbackShell() {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <AppBarSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <aside className="flex w-56 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:w-64">
          <div className="flex flex-1 flex-col gap-2 p-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="h-10 animate-pulse rounded-lg bg-muted"
              />
            ))}
          </div>
        </aside>
        <main className="flex flex-1 flex-col overflow-y-auto">
          <PageContentSkeleton />
        </main>
      </div>
    </div>
  );
}

function RouteFallback() {
  const { pathname } = useLocation();
  const isMobile = useIsMobileViewport();

  const isPublicAuthRoute =
    pathname === '/login' ||
    pathname === '/register' ||
    pathname === '/forgot-password' ||
    pathname === '/reset-password' ||
    pathname === '/check-email' ||
    pathname === '/verify-email' ||
    pathname === '/legal/privacy' ||
    pathname === '/legal/terms' ||
    pathname === '/legal/disclaimer';

  if (isPublicAuthRoute || pathname === '/403') {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-4">
        <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6 h-6 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
            <div className="h-10 w-full animate-pulse rounded-md bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (pathname.startsWith('/operator')) {
    return <OperatorFallbackShell isMobile={isMobile} />;
  }

  if (pathname.startsWith('/admin')) {
    return <AdminFallbackShell />;
  }

  return <PlayerFallbackShell />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* ── Public routes ──────────────────────────────────────── */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/check-email" element={<CheckEmailPage />} />
          <Route path="/verify-email" element={<VerifyEmailPage />} />
          <Route path="/legal/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/legal/terms" element={<TermsOfServicePage />} />
          <Route path="/legal/disclaimer" element={<DisclaimerPage />} />
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/discover" element={<Navigate to="/home" replace />} />

          {/*
           * "/" is public on tenant subdomains so visitors land on the
           * tenant marketing page. Authed users still get auto-redirected to
           * their role home from inside RootRouter.
           */}
          <Route index element={<RootRouter />} />

          {/* ── Protected routes ───────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            {/* ── Player routes ─────────────────────────────────────── */}
            <Route element={<PlayerRoute />}>
              <Route path="home" element={<DiscoverPage />} />
              <Route path="matches/:id" element={<MatchDetailPage />} />
              <Route path="bookings" element={<MyBookingsPage />} />
              <Route path="wallet" element={<WalletPage />} />
              <Route
                path="payments/topup/success"
                element={<TopUpSuccessPage />}
              />
              <Route
                path="payments/topup/cancel"
                element={<TopUpCancelPage />}
              />
              <Route
                path="payments/topup/failure"
                element={<TopUpFailurePage />}
              />
              <Route path="profile" element={<ProfilePage />} />
            </Route>

            {/* ── Operator routes ───────────────────────────────────── */}
            <Route path="operator" element={<OperatorRoute />}>
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="matches" element={<MatchListPage />} />
              <Route path="matches/new" element={<CreateMatchPage />} />
              <Route path="matches/:id/edit" element={<EditMatchPage />} />
              <Route path="matches/:id/cancel" element={<CancelMatchPage />} />
              <Route path="matches/:id" element={<OperatorMatchDetailPage />} />
              <Route path="venues" element={<VenuesPage />} />
              <Route path="venues/:id" element={<VenueDetailPage />} />
              <Route path="players" element={<PlayerListPage />} />
              <Route path="players/:id" element={<PlayerDetailPage />} />
              <Route path="settings" element={<TenantSettingsPage />} />
              <Route path="profile" element={<OperatorProfilePage />} />
            </Route>

            {/* ── Platform admin routes ─────────────────────────────── */}
            <Route element={<PlatformAdminRoute />}>
              <Route path="admin/tenants" element={<AdminTenantsPage />} />
              <Route
                path="admin/tenants/:id"
                element={<AdminTenantDetailPage />}
              />
              <Route
                path="admin/profile"
                element={<Placeholder title="Admin — profile — coming soon" />}
              />
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
        <OnboardingTour />
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
