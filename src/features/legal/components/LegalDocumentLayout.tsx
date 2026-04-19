import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { Card, CardContent } from '@/components/ui/card';
import { PageControls } from '@/shared/components/PageControls';

type Section = {
  title: string;
  paragraphs: string[];
};

type Props = {
  title: string;
  lastUpdated: string;
  intro: string[];
  sections: Section[];
};

export function LegalDocumentLayout({
  title,
  lastUpdated,
  intro,
  sections,
}: Props) {
  const { t } = useTranslation('legal');

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <main className="flex flex-1 justify-center p-4 sm:p-6">
        <Card className="w-full max-w-4xl">
          <CardContent className="space-y-8 p-6 sm:p-8">
            <header className="space-y-2 border-b border-border pb-5">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">
                {title}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('shared.lastUpdated', { date: lastUpdated })}
              </p>
            </header>

            <section className="space-y-3">
              {intro.map((paragraph, i) => (
                <p key={i} className="text-sm leading-6 text-foreground/95">
                  {paragraph}
                </p>
              ))}
            </section>

            {sections.map((section, i) => (
              <section key={i} className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph, j) => (
                  <p key={j} className="text-sm leading-6 text-foreground/95">
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <footer className="space-y-2 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">
                {t('shared.footer')}
              </p>
              <Link
                to="/login"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('shared.backToLogin')}
              </Link>
            </footer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
