import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage';
import { LoginPage } from '@/features/auth/pages/LoginPage';
import { RegisterPage } from '@/features/auth/pages/RegisterPage';
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        {/* Placeholder routes — replace with real pages as features are built */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/discover"
          element={
            <div className="p-8 text-center text-muted-foreground">
              Discover — coming soon
            </div>
          }
        />
        <Route
          path="/admin"
          element={
            <div className="p-8 text-center text-muted-foreground">
              Admin dashboard — coming soon
            </div>
          }
        />
        <Route
          path="/operator"
          element={
            <div className="p-8 text-center text-muted-foreground">
              Operator dashboard — coming soon
            </div>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
