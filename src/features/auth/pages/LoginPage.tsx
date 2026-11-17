import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
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
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { ApiError } from '@/api/client';
import { PageControls } from '@/shared/components/PageControls';
import { loginRequest } from '../api';
import { getRoleHomePath } from '../utils';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, isDemoMode } from '@/lib/demo';

const E164_RE = /^\+[1-9]\d{6,14}$/;

const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, 'identifierRequired')
    .refine(
      (val) => z.string().email().safeParse(val).success || E164_RE.test(val),
      'identifierInvalid',
    ),
  password: z.string().min(1, 'passwordRequired').min(8, 'passwordMin'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionUser = useAuthStore((s) => s.user);
  const slug = useTenantStore((s) => s.slug);
  const tenantInfo = useTenantStore((s) => s.tenantInfo);

  const isPlatformAdmin = slug === 'platform';

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  });

  // Shown in local dev and in the public demo build (VITE_DEMO_MODE=true).
  const showDemoAccounts =
    (import.meta.env.DEV || isDemoMode()) && !isPlatformAdmin;

  const fillDemoAccount = (email: string) => {
    setValue('identifier', email, { shouldValidate: true });
    setValue('password', DEMO_PASSWORD, { shouldValidate: true });
  };

  const resolveFieldError = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    const msgKey = `loginPage.validation.${key}` as const;
    const translated = t(msgKey);
    return translated !== msgKey ? translated : key;
  };

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const data = await loginRequest(values);
      login(data.accessToken, data.refreshToken, data.expiresIn, data.user);
      const homePath = getRoleHomePath(data.user.role);
      navigate(homePath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 401) {
          const msg = err.message.toLowerCase();
          if (msg.includes('suspended')) {
            setServerError(t('loginPage.errors.suspended'));
          } else if (msg.includes('verify') && msg.includes('email')) {
            // Not logged in — send to the check-email screen so they can resend
            const prefillEmail = values.identifier.includes('@')
              ? values.identifier
              : undefined;
            navigate('/check-email', { state: { email: prefillEmail } });
            return;
          } else {
            setServerError(t('loginPage.errors.invalidCredentials'));
          }
        } else if (err.statusCode === 403) {
          const msg = err.message.toLowerCase();
          if (msg.includes('tenant') || msg.includes('club')) {
            setServerError(t('loginPage.errors.inactiveTenant'));
          } else {
            setServerError(t('loginPage.errors.inactiveAccount'));
          }
        } else {
          setServerError(t('loginPage.errors.unknown'));
        }
      } else if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('fetch')
      ) {
        setServerError(t('loginPage.errors.network'));
      } else {
        setServerError(t('loginPage.errors.unknown'));
      }
    }
  };

  const displayName =
    tenantInfo?.name ??
    (slug && slug !== 'platform' ? slug.toUpperCase() : 'Sportbooker');
  const logoUrl = tenantInfo?.logoUrl ?? null;

  if (!isSessionReady) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <PageControls />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (isAuthenticated && sessionUser?.role) {
    return <Navigate to={getRoleHomePath(sessionUser.role)} replace />;
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Tenant branding */}
          <div className="flex flex-col items-center gap-3 text-center">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={displayName}
                className="h-14 w-14 rounded-xl object-cover ring-1 ring-foreground/10"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-2xl font-bold text-primary-foreground ring-1 ring-foreground/10">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-semibold text-foreground">
                {displayName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {t('loginPage.subtitle')}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('loginPage.title')}</CardTitle>
              {serverError && (
                <CardDescription>
                  <span
                    role="alert"
                    className="block rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                  >
                    {serverError}
                  </span>
                </CardDescription>
              )}
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                {showDemoAccounts && (
                  <div className="flex flex-wrap gap-1.5 rounded-md border border-dashed border-amber-400/60 bg-amber-50/50 p-2 dark:bg-amber-900/10">
                    <span className="w-full text-xs font-semibold text-amber-700 dark:text-amber-300">
                      {t('loginPage.demo.title')}
                    </span>
                    <span className="w-full text-[11px] text-amber-700/80 dark:text-amber-300/70">
                      {t('loginPage.demo.hint')}
                    </span>
                    {DEMO_ACCOUNTS.map(({ role, email }) => (
                      <button
                        key={email}
                        type="button"
                        title={email}
                        onClick={() => fillDemoAccount(email)}
                        className="rounded-full border border-amber-300 bg-white px-2.5 py-0.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:border-amber-600/40 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                      >
                        {t(`loginPage.demo.roles.${role}`)}
                      </button>
                    ))}
                  </div>
                )}
                {/* Identifier field (email or phone) */}
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="identifier"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('loginPage.identifier')}
                  </label>
                  <Input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    placeholder={t('loginPage.identifierPlaceholder')}
                    aria-invalid={!!errors.identifier}
                    {...register('identifier')}
                  />
                  {errors.identifier && (
                    <p className="text-xs text-destructive" role="alert">
                      {resolveFieldError(errors.identifier.message)}
                    </p>
                  )}
                </div>

                {/* Password field */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="password"
                      className="text-sm font-medium text-foreground"
                    >
                      {t('loginPage.password')}
                    </label>
                    <Link
                      to="/forgot-password"
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      {t('loginPage.forgotPassword')}
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder={t('loginPage.passwordPlaceholder')}
                      aria-invalid={!!errors.password}
                      className="pr-9"
                      {...register('password')}
                    />
                    <button
                      type="button"
                      aria-label={
                        showPassword ? 'Hide password' : 'Show password'
                      }
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 inset-e-0 flex items-center px-2.5 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? (
                        <EyeOff className="size-4" />
                      ) : (
                        <Eye className="size-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-destructive" role="alert">
                      {resolveFieldError(errors.password.message)}
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
                      {t('loginPage.signingIn')}
                    </>
                  ) : (
                    t('loginPage.submitButton')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Register link — hidden on platform subdomain */}
          {!isPlatformAdmin && (
            <p className="text-center text-sm text-muted-foreground">
              {t('loginPage.noAccount')}{' '}
              <Link
                to="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                {t('register')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
