import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import './index.css';
import './i18n/config';
import i18n from '@/i18n/config';
import App from './App.tsx';
import { HtmlLangDir } from '@/components/HtmlLangDir';
import { useLocaleStore } from '@/stores/localeStore';
import { useTenantStore } from '@/stores/tenantStore';
import { useAuthStore } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60,
      retry: 1,
    },
  },
});

const code = i18n.language?.split('-')[0];
if (code === 'en' || code === 'ar') {
  useLocaleStore.setState({ locale: code });
} else {
  useLocaleStore.setState({ locale: 'en' });
}

const l = useLocaleStore.getState().locale;
document.documentElement.lang = l;
document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';

// Apply persisted theme before first paint to avoid flash
const { theme } = useThemeStore.getState();
document.documentElement.classList.toggle('dark', theme === 'dark');

// Tenant slug from window.location.hostname (VITE_APP_DOMAIN + extractTenantSlug)
useTenantStore.getState().resolveTenant();

// If persist already hydrated synchronously (Zustand v5), onFinishHydration
// may never fire. Handle both cases.
if (useAuthStore.persist.hasHydrated()) {
  void useAuthStore
    .getState()
    .restoreSession()
    .finally(() => {
      useAuthStore.setState({ isSessionReady: true });
    });
} else {
  useAuthStore.persist.onFinishHydration(() => {
    void useAuthStore
      .getState()
      .restoreSession()
      .finally(() => {
        useAuthStore.setState({ isSessionReady: true });
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <HtmlLangDir />
    <App />
    <Toaster richColors position="top-right" />
    <ReactQueryDevtools initialIsOpen={false} />
  </QueryClientProvider>,
);
