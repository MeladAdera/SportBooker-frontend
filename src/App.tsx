import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';
import { ForbiddenPage } from '@/routes/ForbiddenPage';
import {
  OperatorRoute,
  PlatformAdminRoute,
  PlayerRoute,
  ProtectedRoute,
} from '@/routes/guards';
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
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/discover" element={<Navigate to="/" replace />} />

        <Route element={<ProtectedRoute />}>
          {/* Use index + relative paths under pathless layouts — nested path="/" often fails to match, so * sends users to /login and fights Login’s redirect (loop). */}
          <Route element={<PlayerRoute />}>
            <Route index element={<Placeholder title="Home — coming soon" />} />
            <Route
              path="bookings"
              element={<Placeholder title="Bookings — coming soon" />}
            />
            <Route
              path="wallet"
              element={<Placeholder title="Wallet — coming soon" />}
            />
            <Route
              path="profile"
              element={<Placeholder title="Profile — coming soon" />}
            />
          </Route>

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
            <Route
              path="settings"
              element={<Placeholder title="Settings — coming soon" />}
            />
          </Route>

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
