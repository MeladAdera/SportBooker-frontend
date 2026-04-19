import { useTranslation } from 'react-i18next';

import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

type Section = { title: string; paragraphs: string[] };

export function TermsOfServicePage() {
  const { t } = useTranslation('legal');

  const intro = t('terms.intro', { returnObjects: true }) as string[];
  const sections = t('terms.sections', { returnObjects: true }) as Section[];

  return (
    <LegalDocumentLayout
      title={t('terms.title')}
      lastUpdated={t('terms.lastUpdated')}
      intro={intro}
      sections={sections}
    />
  );
}
