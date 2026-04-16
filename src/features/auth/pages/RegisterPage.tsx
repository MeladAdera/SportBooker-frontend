import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { ApiError } from '@/api/client';
import { PageControls } from '@/shared/components/PageControls';
import { passwordStrengthScore, strengthLabelKey } from '../passwordStrength';
import { registerRequest } from '../api';
import { getRoleHomePath } from '../utils';

const PHONE_RE = /^\+?[0-9][\d\s\-()]{7,}$/;

const registerSchema = z
  .object({
    name: z.string().min(1, 'nameRequired').min(2, 'nameMin'),
    email: z.string().min(1, 'emailRequired').email('emailInvalid'),
    password: z.string().min(1, 'passwordRequired').min(8, 'passwordMin'),
    phone: z.string().min(1, 'phoneRequired'),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, { message: 'termsRequired' }),
  })
  .superRefine((data, ctx) => {
    const p = data.phone.trim();
    if (!PHONE_RE.test(p)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'phoneInvalid',
        path: ['phone'],
      });
    }
  });

type RegisterFormValues = z.infer<typeof registerSchema>;

/** Map Nest validation field names to form keys. */
const BACKEND_FIELD_MAP: Record<string, keyof RegisterFormValues> = {
  email: 'email',
  name: 'name',
  password: 'password',
  phone: 'phone',
  phoneNumber: 'phone',
};

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionUser = useAuthStore((s) => s.user);
  const slug = useTenantStore((s) => s.slug);
  const isResolved = useTenantStore((s) => s.isResolved);
  const tenantInfo = useTenantStore((s) => s.tenantInfo);

  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      acceptTerms: false,
    },
  });

  const passwordValue =
    useWatch({ control, name: 'password', defaultValue: '' }) ?? '';

  const strength = useMemo(() => {
    const score = passwordStrengthScore(passwordValue);
    return { score, label: strengthLabelKey(score) };
  }, [passwordValue]);

  const resolveFieldError = (key: string | undefined): string | undefined => {
    if (!key) return undefined;
    const msgKey = `registerPage.validation.${key}` as const;
    const translated = t(msgKey);
    return translated !== msgKey ? translated : key;
  };

  const fieldMessage = (
    field: keyof RegisterFormValues,
  ): string | undefined => {
    const e = errors[field];
    if (!e?.message) return undefined;
    if (e.type === 'server') return e.message;
    return resolveFieldError(e.message);
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      const data = await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone.trim(),
      });
      login(data.accessToken, data.refreshToken, data.expiresIn, data.user);
      navigate(getRoleHomePath(data.user.role), { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setServerError(t('registerPage.errors.emailTaken'));
        } else if (err.statusCode === 403) {
          const msg = err.message.toLowerCase();
          if (msg.includes('tenant') || msg.includes('club')) {
            setServerError(t('registerPage.errors.inactiveTenant'));
          } else {
            setServerError(t('registerPage.errors.unknown'));
          }
        } else if (err.statusCode === 422) {
          if (err.errors?.length) {
            for (const e of err.errors) {
              const tail = e.field.includes('.')
                ? e.field.split('.').pop()!
                : e.field;
              const key = BACKEND_FIELD_MAP[e.field] ?? BACKEND_FIELD_MAP[tail];
              if (key) {
                setError(key, { type: 'server', message: e.message });
              }
            }
          } else {
            setServerError(err.message);
          }
        } else {
          setServerError(t('registerPage.errors.unknown'));
        }
      } else if (
        err instanceof TypeError &&
        err.message.toLowerCase().includes('fetch')
      ) {
        setServerError(t('registerPage.errors.network'));
      } else {
        setServerError(t('registerPage.errors.unknown'));
      }
    }
  };

  const displayName =
    tenantInfo?.name ??
    (slug && slug !== 'platform' ? slug.toUpperCase() : 'Sportbooker');
  const logoUrl = tenantInfo?.logoUrl ?? null;

  // Wait for both session and tenant to resolve before making any redirect decision.
  if (!isSessionReady || !isResolved) {
    return (
      <div className="flex min-h-svh flex-col bg-background">
        <PageControls />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  // Redirect already-authenticated users to their home.
  if (isAuthenticated && sessionUser?.role) {
    return <Navigate to={getRoleHomePath(sessionUser.role)} replace />;
  }

  // Register is only for tenant subdomains — platform and apex redirect to login.
  if (slug === 'platform' || slug === null) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
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
                {t('registerPage.subtitle')}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t('registerPage.title')}</CardTitle>
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
                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-name"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('registerPage.name')}
                  </label>
                  <Input
                    id="reg-name"
                    autoComplete="name"
                    placeholder={t('registerPage.namePlaceholder')}
                    aria-invalid={!!errors.name}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-destructive" role="alert">
                      {fieldMessage('name')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-email"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('registerPage.email')}
                  </label>
                  <Input
                    id="reg-email"
                    type="email"
                    autoComplete="email"
                    placeholder={t('registerPage.emailPlaceholder')}
                    aria-invalid={!!errors.email}
                    {...register('email')}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive" role="alert">
                      {fieldMessage('email')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-password"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('registerPage.password')}
                  </label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder={t('registerPage.passwordPlaceholder')}
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
                            : Math.min(4, Math.ceil((strength.score / 5) * 4));
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
                  {errors.password && (
                    <p className="text-xs text-destructive" role="alert">
                      {fieldMessage('password')}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label
                    htmlFor="reg-phone"
                    className="text-sm font-medium text-foreground"
                  >
                    {t('registerPage.phone')}
                  </label>
                  <Input
                    id="reg-phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder={t('registerPage.phonePlaceholder')}
                    required
                    aria-required="true"
                    aria-invalid={!!errors.phone}
                    {...register('phone')}
                  />
                  {errors.phone && (
                    <p className="text-xs text-destructive" role="alert">
                      {fieldMessage('phone')}
                    </p>
                  )}
                </div>

                <div className="flex items-start gap-2">
                  <Controller
                    name="acceptTerms"
                    control={control}
                    render={({ field }) => (
                      <input
                        id="reg-terms"
                        type="checkbox"
                        className="mt-1 size-4 shrink-0 rounded border border-input accent-primary"
                        checked={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        ref={field.ref}
                      />
                    )}
                  />
                  <label
                    htmlFor="reg-terms"
                    className="text-sm leading-snug text-foreground"
                  >
                    {t('registerPage.termsLabel')}
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-xs text-destructive" role="alert">
                    {fieldMessage('acceptTerms')}
                  </p>
                )}

                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" />
                      {t('registerPage.submitting')}
                    </>
                  ) : (
                    t('registerPage.submitButton')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-sm text-muted-foreground">
            {t('registerPage.haveAccount')}{' '}
            <Link
              to="/login"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
