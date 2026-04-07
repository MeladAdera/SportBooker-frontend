import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { LocaleSwitcher } from '@/shared/components/LocaleSwitcher';
import { forgotPasswordRequest } from '../api';

const forgotSchema = z.object({
  email: z.string().min(1, 'emailRequired').email('emailInvalid'),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

export function ForgotPasswordPage() {
  const { t } = useTranslation('auth');
  const [success, setSuccess] = useState(false);
  const [networkError, setNetworkError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormValues>({
    resolver: zodResolver(forgotSchema),
  });

  const resolveFieldError = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    const msgKey = `forgotPasswordPage.validation.${key}` as const;
    const translated = t(msgKey);
    return translated !== msgKey ? translated : key;
  };

  const onSubmit = async (values: ForgotFormValues) => {
    setNetworkError(null);
    try {
      await forgotPasswordRequest({ email: values.email });
      setSuccess(true);
    } catch {
      setNetworkError(t('forgotPasswordPage.errors.network'));
    }
  };

  return (
    <div className="relative flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <LocaleSwitcher className="fixed top-4 inset-e-4 z-50" />
      <div className="w-full max-w-sm space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('forgotPasswordPage.title')}</CardTitle>
            <CardDescription>
              {t('forgotPasswordPage.subtitle')}
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col gap-4">
            {success ? (
              <div
                role="status"
                className="rounded-md border border-border bg-muted/40 px-3 py-3 text-sm text-foreground"
              >
                {t('forgotPasswordPage.successMessage')}
              </div>
            ) : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                {networkError && (
                  <p
                    role="alert"
                    className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                  >
                    {networkError}
                  </p>
                )}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="forgot-email"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('forgotPasswordPage.email')}
                  </label>
                  <Input
                    id="forgot-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('forgotPasswordPage.emailPlaceholder')}
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive" role="alert">
                      {resolveFieldError(errors.email.message)}
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
                      {t('forgotPasswordPage.submitting')}
                    </>
                  ) : (
                    t('forgotPasswordPage.submitButton')
                  )}
                </Button>
              </form>
            )}

            <p className="text-center text-sm text-muted-foreground">
              <Link
                to="/login"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('forgotPasswordPage.backToLogin')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
