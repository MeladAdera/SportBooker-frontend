import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { DiscoverPage } from '@/features/player/pages/DiscoverPage';
import { MatchDetailPage } from '@/features/player/pages/MatchDetailPage';
import { MyBookingsPage } from '@/features/player/pages/MyBookingsPage';
import { WalletPage } from '@/features/player/pages/WalletPage';
import { ProfilePage } from '@/features/player/pages/ProfilePage';
import { TopUpSuccessPage } from '@/features/player/pages/TopUpSuccessPage';
import { TopUpCancelPage } from '@/features/player/pages/TopUpCancelPage';
import { TopUpFailurePage } from '@/features/player/pages/TopUpFailurePage';
import { TenantSettingsPage } from '@/features/operator/pages/TenantSettingsPage';
import { ForbiddenPage } from '@/routes/ForbiddenPage';
import {
  OperatorRoute,
  PlatformAdminRoute,
  PlayerRoute,
  ProtectedRoute,
} from '@/routes/guards';
import { RoleBasedRouter } from '@/routes/RoleBasedRouter';
import { PageControls } from '@/shared/components/PageControls';

function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
      {title}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      {/* DEV: global theme/locale controls — remove or guard with import.meta.env.DEV before prod */}
      <PageControls />
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
            <Route path="payments/topup/cancel" element={<TopUpCancelPage />} />
            <Route
              path="payments/topup/failure"
              element={<TopUpFailurePage />}
            />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* ── Operator routes ───────────────────────────────────── */}
          <Route element={<OperatorRoute />}>
            <Route
              path="dashboard"
              element={<Placeholder title="Dashboard — coming soon" />}
            />
            <Route
              path="matches"
              element={<Placeholder title="Matches — coming soon" />}
            />
            <Route
              path="venues"
              element={<Placeholder title="Venues — coming soon" />}
            />
            <Route
              path="players"
              element={<Placeholder title="Players — coming soon" />}
            />
            <Route path="settings" element={<TenantSettingsPage />} />
          </Route>

          {/* ── Platform admin routes ─────────────────────────────── */}
          <Route element={<PlatformAdminRoute />}>
            <Route
              path="admin/tenants"
              element={<Placeholder title="Admin — tenants — coming soon" />}
            />
            <Route
              path="admin/profile"
              element={<Placeholder title="Admin — profile — coming soon" />}
            />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
