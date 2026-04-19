import { useTranslation } from 'react-i18next';

import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

type Section = { title: string; paragraphs: string[] };

export function PrivacyPolicyPage() {
  const { t } = useTranslation('legal');

  const intro = t('privacy.intro', { returnObjects: true }) as string[];
  const sections = t('privacy.sections', { returnObjects: true }) as Section[];

  return (
    <LegalDocumentLayout
      title={t('privacy.title')}
      lastUpdated={t('privacy.lastUpdated')}
      intro={intro}
      sections={sections}
    />
  );
}
