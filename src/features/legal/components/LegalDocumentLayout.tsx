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
                Last updated: {lastUpdated}
              </p>
            </header>

            <section className="space-y-3">
              {intro.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-sm leading-6 text-foreground/95"
                >
                  {paragraph}
                </p>
              ))}
            </section>

            {sections.map((section) => (
              <section key={section.title} className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {section.title}
                </h2>
                {section.paragraphs.map((paragraph) => (
                  <p
                    key={`${section.title}-${paragraph}`}
                    className="text-sm leading-6 text-foreground/95"
                  >
                    {paragraph}
                  </p>
                ))}
              </section>
            ))}

            <footer className="space-y-2 border-t border-border pt-5">
              <p className="text-xs text-muted-foreground">
                If you do not agree with these terms, please stop using the
                platform and contact your club or tenant operator.
              </p>
              <Link
                to="/login"
                className="inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                Back to login
              </Link>
            </footer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
