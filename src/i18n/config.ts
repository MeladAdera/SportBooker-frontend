import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import { readPersistedLocale } from '@/stores/locale-persist';

import enAdmin from './en/admin.json';
import enAuth from './en/auth.json';
import enCommon from './en/common.json';
import enLegal from './en/legal.json';
import enOperator from './en/operator.json';
import enPlayer from './en/player.json';
import enTenantPublic from './en/tenant-public.json';

import arAdmin from './ar/admin.json';
import arAuth from './ar/auth.json';
import arCommon from './ar/common.json';
import arLegal from './ar/legal.json';
import arOperator from './ar/operator.json';
import arPlayer from './ar/player.json';
import arTenantPublic from './ar/tenant-public.json';

const NAMESPACES = [
  'common',
  'auth',
  'player',
  'operator',
  'admin',
  'legal',
  'tenant-public',
] as const;

const stored = readPersistedLocale();

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    lng: stored ?? undefined,
    fallbackLng: 'en',
    supportedLngs: ['en', 'ar'],
    load: 'languageOnly',
    ns: [...NAMESPACES],
    defaultNS: 'common',
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    detection: {
      order: stored ? [] : ['navigator'],
      caches: [],
    },
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        player: enPlayer,
        operator: enOperator,
        admin: enAdmin,
        legal: enLegal,
        'tenant-public': enTenantPublic,
      },
      ar: {
        common: arCommon,
        auth: arAuth,
        player: arPlayer,
        operator: arOperator,
        admin: arAdmin,
        legal: arLegal,
        'tenant-public': arTenantPublic,
      },
    },
  });

export default i18n;
