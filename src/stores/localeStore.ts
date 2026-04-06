import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import i18n from '@/i18n/config';
import { LOCALE_STORAGE_KEY, readPersistedLocale } from './locale-persist';

export type Locale = 'en' | 'ar';

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: readPersistedLocale() ?? 'en',
      setLocale: (locale) => {
        set({ locale });
        void i18n.changeLanguage(locale);
      },
    }),
    {
      name: LOCALE_STORAGE_KEY,
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state?.locale) {
          void i18n.changeLanguage(state.locale);
        }
      },
    },
  ),
);
