import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import {
  OperatorRoute,
  PlatformAdminRoute,
  PlayerRoute,
  ProtectedRoute,
} from '@/routes/guards';
import { RoleBasedRouter } from '@/routes/RoleBasedRouter';

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

function RouteFallback() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  );
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
          <Route path="/403" element={<ForbiddenPage />} />
          <Route path="/discover" element={<Navigate to="/home" replace />} />

          {/* ── Protected routes ───────────────────────────────────── */}
          <Route element={<ProtectedRoute />}>
            {/* "/" redirects each role to their appropriate home path */}
            <Route index element={<RoleBasedRouter />} />

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
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
