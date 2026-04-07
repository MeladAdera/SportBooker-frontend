import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { LoginPage } from '@/features/auth/pages/LoginPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Placeholder routes — replace with real pages as features are built */}
        <Route
          path="/forgot-password"
          element={
            <div className="p-8 text-center text-muted-foreground">
              Forgot password — coming soon
            </div>
          }
        />
        <Route
          path="/register"
          element={
            <div className="p-8 text-center text-muted-foreground">
              Register — coming soon
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
