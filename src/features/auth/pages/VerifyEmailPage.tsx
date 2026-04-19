import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

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
import { verifyEmailRequest, resendVerificationRequest } from '../api';

type VerifyStatus = 'loading' | 'success' | 'error';
type ResendStatus = 'idle' | 'sent' | 'error';

const COOLDOWN_SECONDS = 30;

export function VerifyEmailPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [verifyStatus, setVerifyStatus] = useState<VerifyStatus>('loading');
  const [resendEmail, setResendEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<ResendStatus>('idle');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Guard against React StrictMode double-invoke
  const calledRef = useRef(false);

  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
      return;
    }
    if (calledRef.current) return;
    calledRef.current = true;

    verifyEmailRequest(token)
      .then(() => setVerifyStatus('success'))
      .catch(() => setVerifyStatus('error'));
  }, [token, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const validateEmail = (value: string): boolean => {
    if (!value.trim()) {
      setEmailError(t('verifyEmailPage.validation.emailRequired'));
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
      setEmailError(t('verifyEmailPage.validation.emailInvalid'));
      return false;
    }
    setEmailError(null);
    return true;
  };

  const handleResend = async () => {
    if (cooldown > 0 || isResending) return;
    if (!validateEmail(resendEmail)) return;

    setIsResending(true);
    setResendStatus('idle');
    try {
      await resendVerificationRequest(resendEmail.trim());
      setResendStatus('sent');
      setCooldown(COOLDOWN_SECONDS);
    } catch {
      setResendStatus('error');
    } finally {
      setIsResending(false);
    }
  };

  const resendLabel = (() => {
    if (isResending) return t('verifyEmailPage.resending');
    if (cooldown > 0)
      return t('verifyEmailPage.resendCooldown', { seconds: cooldown });
    return t('verifyEmailPage.resendButton');
  })();

  if (verifyStatus === 'loading') {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <PageControls />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            {t('verifyEmailPage.loading')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {verifyStatus === 'success' ? (
            <>
              {/* Success state */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:text-emerald-400">
                  <CheckCircle2 className="size-7" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {t('verifyEmailPage.successTitle')}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('verifyEmailPage.successMessage')}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => navigate('/login', { replace: true })}
              >
                {t('verifyEmailPage.signInButton')}
              </Button>
            </>
          ) : (
            <>
              {/* Error state */}
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-destructive/10 text-destructive ring-1 ring-destructive/20">
                  <XCircle className="size-7" />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-foreground">
                    {t('verifyEmailPage.errorTitle')}
                  </h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {t('verifyEmailPage.errorMessage')}
                  </p>
                </div>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t('verifyEmailPage.resendButton')}
                  </CardTitle>
                  <CardDescription>
                    {t('verifyEmailPage.errorMessage')}
                  </CardDescription>
                </CardHeader>

                <CardContent className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="verify-resend-email"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('verifyEmailPage.emailLabel')}
                    </label>
                    <Input
                      id="verify-resend-email"
                      type="email"
                      autoComplete="email"
                      placeholder={t('verifyEmailPage.emailPlaceholder')}
                      value={resendEmail}
                      onChange={(e) => {
                        setResendEmail(e.target.value);
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

                  {resendStatus === 'sent' && (
                    <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-50/60 px-3 py-2.5 text-sm text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-950/30 dark:text-emerald-400">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                      <span>{t('verifyEmailPage.resendSuccess')}</span>
                    </div>
                  )}
                  {resendStatus === 'error' && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                    >
                      <AlertCircle className="mt-0.5 size-4 shrink-0" />
                      <span>{t('verifyEmailPage.errors.unknown')}</span>
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
                  {t('verifyEmailPage.backToLogin')}
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
