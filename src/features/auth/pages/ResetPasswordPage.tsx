import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiError } from '@/api/client';
import { cn } from '@/lib/utils';
import { PageControls } from '@/shared/components/PageControls';
import { resetPasswordRequest } from '../api';
import { passwordStrengthScore, strengthLabelKey } from '../passwordStrength';

const resetSchema = z
  .object({
    newPassword: z.string().min(1, 'passwordRequired').min(8, 'passwordMin'),
    confirmPassword: z.string().min(1, 'confirmRequired'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'passwordMismatch',
    path: ['confirmPassword'],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';

  const [success, setSuccess] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      newPassword: '',
      confirmPassword: '',
    },
  });

  const passwordValue =
    useWatch({ control, name: 'newPassword', defaultValue: '' }) ?? '';

  const strength = useMemo(() => {
    const score = passwordStrengthScore(passwordValue);
    return { score, label: strengthLabelKey(score) };
  }, [passwordValue]);

  useEffect(() => {
    if (!success) return;
    const id = window.setTimeout(() => {
      navigate('/login', { replace: true });
    }, 3000);
    return () => window.clearTimeout(id);
  }, [success, navigate]);

  const resolveFieldError = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    const msgKey = `resetPasswordPage.validation.${key}` as const;
    const translated = t(msgKey);
    return translated !== msgKey ? translated : key;
  };

  const onSubmit = async (values: ResetFormValues) => {
    setServerError(null);
    try {
      await resetPasswordRequest({
        token,
        newPassword: values.newPassword,
      });
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (
          err.statusCode === 400 ||
          err.statusCode === 401 ||
          err.statusCode === 403 ||
          err.statusCode === 404
        ) {
          setServerError(t('resetPasswordPage.errors.invalidOrExpired'));
        } else {
          setServerError(t('resetPasswordPage.errors.unknown'));
        }
      } else if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('fetch')
      ) {
        setServerError(t('resetPasswordPage.errors.network'));
      } else {
        setServerError(t('resetPasswordPage.errors.unknown'));
      }
    }
  };

  const invalidToken = !token;

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('resetPasswordPage.title')}</CardTitle>
              <CardDescription>
                {invalidToken
                  ? t('resetPasswordPage.invalidTokenMessage')
                  : t('resetPasswordPage.subtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {success && (
                <div
                  role="status"
                  className="space-y-2 rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-foreground"
                >
                  <p>{t('resetPasswordPage.successMessage')}</p>
                  <p className="text-muted-foreground">
                    {t('resetPasswordPage.redirectHint')}
                  </p>
                </div>
              )}

              {!invalidToken && !success && (
                <form
                  onSubmit={handleSubmit(onSubmit)}
                  noValidate
                  className="flex flex-col gap-4"
                >
                  {serverError && (
                    <p
                      role="alert"
                      className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                    >
                      {serverError}
                    </p>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="reset-new-password"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('resetPasswordPage.newPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        id="reset-new-password"
                        type={showNew ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t('resetPasswordPage.passwordPlaceholder')}
                        aria-invalid={!!errors.newPassword}
                        className="pr-9"
                        {...register('newPassword')}
                      />
                      <button
                        type="button"
                        aria-label={showNew ? 'Hide password' : 'Show password'}
                        onClick={() => setShowNew((v) => !v)}
                        className="absolute inset-y-0 inset-e-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showNew ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      <div
                        className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-muted"
                        role="group"
                        aria-label={t('registerPage.passwordStrength.label')}
                      >
                        {[0, 1, 2, 3].map((i) => {
                          const filled =
                            strength.label === 'empty'
                              ? 0
                              : Math.min(
                                  4,
                                  Math.ceil((strength.score / 5) * 4),
                                );
                          const tone =
                            strength.label === 'weak'
                              ? 'bg-destructive/80'
                              : strength.label === 'medium'
                                ? 'bg-amber-500/90'
                                : strength.label === 'strong'
                                  ? 'bg-emerald-600'
                                  : 'bg-muted-foreground/20';
                          return (
                            <div
                              key={i}
                              className={cn(
                                'h-full flex-1 rounded-full transition-colors',
                                i < filled ? tone : 'bg-muted-foreground/15',
                              )}
                            />
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passwordValue.length > 0
                          ? t(`registerPage.passwordStrength.${strength.label}`)
                          : t('registerPage.passwordStrength.empty')}
                      </p>
                    </div>
                    {errors.newPassword && (
                      <p className="text-xs text-destructive" role="alert">
                        {resolveFieldError(errors.newPassword.message)}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label
                      htmlFor="reset-confirm-password"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('resetPasswordPage.confirmPassword')}
                    </label>
                    <div className="relative">
                      <Input
                        id="reset-confirm-password"
                        type={showConfirm ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder={t(
                          'resetPasswordPage.confirmPasswordPlaceholder',
                        )}
                        aria-invalid={!!errors.confirmPassword}
                        className="pr-9"
                        {...register('confirmPassword')}
                      />
                      <button
                        type="button"
                        aria-label={
                          showConfirm ? 'Hide password' : 'Show password'
                        }
                        onClick={() => setShowConfirm((v) => !v)}
                        className="absolute inset-y-0 inset-e-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? (
                          <EyeOff className="size-4" />
                        ) : (
                          <Eye className="size-4" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-xs text-destructive" role="alert">
                        {resolveFieldError(errors.confirmPassword.message)}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" />
                        {t('resetPasswordPage.submitting')}
                      </>
                    ) : (
                      t('resetPasswordPage.submitButton')
                    )}
                  </Button>
                </form>
              )}

              <div className="flex flex-col gap-2 text-center text-sm text-muted-foreground">
                <Link
                  to="/forgot-password"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t('resetPasswordPage.requestNewLink')}
                </Link>
                <Link
                  to="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  {t('resetPasswordPage.backToLogin')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
