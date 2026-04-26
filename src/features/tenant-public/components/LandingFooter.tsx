import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

import { LegalLinks } from '@/shared/components/LegalLinks';

import { BrandLogo } from './BrandLogo';

type Props = {
  displayName: string;
  logoUrl: string | null;
  appHomePath: string | null;
};

export function LandingFooter({ displayName, logoUrl, appHomePath }: Props) {
  const { t } = useTranslation('tenant-public');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div className="space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={displayName}
            >
              <BrandLogo
                name={displayName}
                logoUrl={logoUrl}
                className="h-9 w-9"
                rounded="rounded-xl"
              />
              <span className="text-base font-semibold text-foreground">
                {displayName}
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              {t('footer.tagline', { name: displayName })}{' '}
              <span className="text-foreground/80">
                {t('footer.poweredBy')}
              </span>
              .
            </p>
          </div>

          {/* Get started column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('footer.sections.product.title')}
            </h3>
            <ul role="list" className="mt-4 space-y-2.5 text-sm">
              {appHomePath ? (
                <li>
                  <Link
                    to={appHomePath}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {t('footer.sections.product.openApp')}
                  </Link>
                </li>
              ) : (
                <>
                  <li>
                    <Link
                      to="/login"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t('footer.sections.product.signIn')}
                    </Link>
                  </li>
                  <li>
                    <Link
                      to="/register"
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {t('footer.sections.product.createAccount')}
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {t('footer.sections.legal.title')}
            </h3>
            <div className="mt-4">
              <LegalLinks className="text-sm" />
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start gap-2 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>{t('footer.rights', { year, name: displayName })}</p>
          <p>{t('footer.poweredBy')}</p>
        </div>
      </div>
    </footer>
  );
}
