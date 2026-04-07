import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import './i18n/config';
import i18n from '@/i18n/config';
import App from './App.tsx';
import { HtmlLangDir } from '@/components/HtmlLangDir';
import { useLocaleStore } from '@/stores/localeStore';
import { useTenantStore } from '@/stores/tenantStore';
import { useAuthStore } from '@/stores/authStore';

const code = i18n.language?.split('-')[0];
if (code === 'en' || code === 'ar') {
  useLocaleStore.setState({ locale: code });
} else {
  useLocaleStore.setState({ locale: 'en' });
}

const l = useLocaleStore.getState().locale;
document.documentElement.lang = l;
document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';

// Tenant slug from window.location.hostname (VITE_APP_DOMAIN + extractTenantSlug)
useTenantStore.getState().resolveTenant();

useAuthStore.persist.onFinishHydration(() => {
  void useAuthStore.getState().restoreSession();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <>
      <HtmlLangDir />
      <App />
    </>
  </StrictMode>,
);
