import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router-dom';
import { Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { PageControls } from '@/shared/components/PageControls';
import { resendVerificationRequest } from '../api';

type LocationState = { email?: string } | null;

type ResendStatus = 'idle' | 'sent' | 'error';

const COOLDOWN_SECONDS = 30;

export function CheckEmailPage() {
  const { t } = useTranslation('auth');
  const location = useLocation();
  const routeEmail = (location.state as LocationState)?.email ?? '';

  const [email, setEmail] = useState(routeEmail);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('checkEmailPage.validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setEmailError(t('checkEmailPage.validation.emailInvalid'));
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!validateEmail(email)) return;

    setIsResending(true);
    setResendStatus('idle');
    try {
      await resendVerificationRequest(email.trim());
      setResendStatus('sent');
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const resendLabel = (() => {
    if (isResending) return t('checkEmailPage.resending');
    if (cooldown > 0)
      return t('checkEmailPage.resendCooldown', { seconds: cooldown });
    return t('checkEmailPage.resendButton');
  })();

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Icon + heading */}
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
              <Mail className="size-7" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {t('checkEmailPage.title')}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {routeEmail
                  ? t('checkEmailPage.subtitleWithEmail', {
                      email: routeEmail,
                    })
                  : t('checkEmailPage.subtitle')}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {t('checkEmailPage.resendButton')}
              </CardTitle>
              <CardDescription>{t('checkEmailPage.subtitle')}</CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {/* Email input — shown when email was not prefilled from router state */}
              {!routeEmail && (
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="resend-email"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('checkEmailPage.emailLabel')}
                  </label>
                  <Input
                    id="resend-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('checkEmailPage.emailPlaceholder')}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (emailError) setEmailError(null);
                    }}
                    aria-invalid={!!emailError}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive" role="alert">
                      {emailError}
                    </p>
                  )}
                </div>
              )}

              {/* Feedback banners */}
              {resendStatus === 'sent' && (
                <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                  <span>{t('checkEmailPage.resendSuccess')}</span>
                </div>
              )}
              {resendStatus === 'error' && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                >
                  <AlertCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{t('checkEmailPage.errors.unknown')}</span>
                </div>
              )}

              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={handleResend}
                disabled={isResending || cooldown > 0}
              >
                {isResending && <Loader2 className="animate-spin" />}
                {resendLabel}
              </Button>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('checkEmailPage.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
