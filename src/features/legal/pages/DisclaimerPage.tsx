import { useTranslation } from 'react-i18next';

import { LegalDocumentLayout } from '@/features/legal/components/LegalDocumentLayout';

type Section = { title: string; paragraphs: string[] };

export function DisclaimerPage() {
  const { t } = useTranslation('legal');

  const intro = t('disclaimer.intro', { returnObjects: true }) as string[];
  const sections = t('disclaimer.sections', {
    returnObjects: true,
  }) as Section[];

  return (
    <LegalDocumentLayout
      title={t('disclaimer.title')}
      lastUpdated={t('disclaimer.lastUpdated')}
      intro={intro}
      sections={sections}
    />
  );
}
