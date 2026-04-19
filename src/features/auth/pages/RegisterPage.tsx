import { useMemo, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Loader2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronsUpDown,
  Shield,
  ShieldCheck,
  Activity,
  Flame,
  Sprout,
  Target,
  Trophy,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { NATIONALITY_OPTIONS } from '@/lib/nationalities';
import { PHONE_CODES, parsePhone, type PhoneCode } from '@/lib/phone-codes';
import { useAuthStore } from '@/stores/authStore';
import { useTenantStore } from '@/stores/tenantStore';
import { ApiError } from '@/api/client';
import { PageControls } from '@/shared/components/PageControls';
import { passwordStrengthScore, strengthLabelKey } from '../passwordStrength';
import { registerRequest } from '../api';
import { getRoleHomePath } from '../utils';

const PHONE_RE = /^\+[1-9][\d\s\-()]{6,}$/;

const registerSchema = z
  .object({
    name: z.string().min(1, 'nameRequired').min(2, 'nameMin'),
    email: z.string().min(1, 'emailRequired').email('emailInvalid'),
    password: z.string().min(1, 'passwordRequired').min(8, 'passwordMin'),
    phone: z.string().min(1, 'phoneRequired'),
    acceptTerms: z
      .boolean()
      .refine((v) => v === true, { message: 'termsRequired' }),
    // Player profile (all optional)
    dateOfBirth: z.string().optional(),
    nationality: z.string().optional(),
    preferredLanguage: z.string().optional(),
    skillLevel: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    preferredPosition: z
      .enum(['goalkeeper', 'defender', 'midfielder', 'forward'])
      .optional(),
    dominantFoot: z.enum(['left', 'right', 'both']).optional(),
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

const BACKEND_FIELD_MAP: Record<string, keyof RegisterFormValues> = {
  email: 'email',
  name: 'name',
  password: 'password',
  phone: 'phone',
};

const STEP1_FIELDS: Array<keyof RegisterFormValues> = [
  'name',
  'email',
  'password',
  'phone',
  'acceptTerms',
];

// ── Sub-components ─────────────────────────────────────────────────────────────

function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1" aria-hidden>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'h-1 rounded-full transition-all duration-300',
            i < current ? 'bg-primary' : 'bg-muted-foreground/20',
            i === current - 1 ? 'w-7' : 'w-3',
          )}
        />
      ))}
    </div>
  );
}

type OptionCardProps = {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  description?: string;
};

function OptionCard({
  selected,
  onClick,
  icon: Icon,
  label,
  description,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-center gap-1 rounded-xl border p-2.5 text-center transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        selected
          ? 'border-primary bg-primary/8 text-primary ring-1 ring-primary'
          : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:bg-muted/30 hover:text-foreground',
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="text-[11px] font-semibold leading-tight">{label}</span>
      {description && (
        <span className="text-[10px] leading-tight opacity-65">
          {description}
        </span>
      )}
    </button>
  );
}

type FootToggleProps = {
  value: string | undefined;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
};

function FootToggle({ value, onChange, options }: FootToggleProps) {
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'flex-1 rounded-lg border py-2 text-sm font-medium transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
            value === opt.value
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ── BirthDateInput ─────────────────────────────────────────────────────────────

function BirthDateInput({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string | undefined) => void;
}) {
  const { i18n } = useTranslation();

  const parsed = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const [year, setYear] = useState(parsed?.[1] ?? '');
  const [month, setMonth] = useState(parsed?.[2] ?? '');
  const [day, setDay] = useState(parsed?.[3] ?? '');

  const currentYear = new Date().getFullYear();

  const MONTHS = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        value: String(i + 1).padStart(2, '0'),
        label: new Intl.DateTimeFormat(i18n.language, { month: 'long' }).format(
          new Date(2000, i, 1),
        ),
      })),
    [i18n.language],
  );

  const maxDays = useMemo(() => {
    if (!month) return 31;
    return new Date(year ? parseInt(year) : 2000, parseInt(month), 0).getDate();
  }, [month, year]);

  const emit = (d: string, m: string, y: string) => {
    if (d && m && y) onChange(`${y}-${m}-${d}`);
    else onChange(undefined);
  };

  const onDay = (d: string) => {
    setDay(d);
    emit(d, month, year);
  };

  const onMonth = (m: string) => {
    const max = m
      ? new Date(year ? parseInt(year) : 2000, parseInt(m), 0).getDate()
      : 31;
    const safeDay = day && parseInt(day) > max ? '' : day;
    setMonth(m);
    if (safeDay !== day) setDay(safeDay);
    emit(safeDay, m, year);
  };

  const onYear = (y: string) => {
    const max =
      month && y ? new Date(parseInt(y), parseInt(month), 0).getDate() : 31;
    const safeDay = day && parseInt(day) > max ? '' : day;
    setYear(y);
    if (safeDay !== day) setDay(safeDay);
    emit(safeDay, month, y);
  };

  const selectCls = (filled: boolean) =>
    cn(
      'h-9 w-full cursor-pointer appearance-none rounded-lg border border-input',
      'bg-background pe-7 ps-2.5 text-sm transition-colors outline-none',
      'focus:border-ring focus:ring-3 focus:ring-ring/50',
      'dark:bg-input/30 dark:hover:bg-input/50',
      filled ? 'text-foreground' : 'text-muted-foreground',
    );

  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Day */}
      <div className="relative">
        <select
          value={day}
          onChange={(e) => onDay(e.target.value)}
          className={selectCls(!!day)}
        >
          <option value="">DD</option>
          {Array.from({ length: maxDays }, (_, i) => {
            const d = String(i + 1).padStart(2, '0');
            return (
              <option key={d} value={d}>
                {i + 1}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-e-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Month */}
      <div className="relative">
        <select
          value={month}
          onChange={(e) => onMonth(e.target.value)}
          className={selectCls(!!month)}
        >
          <option value="">MM</option>
          {MONTHS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-e-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>

      {/* Year */}
      <div className="relative">
        <select
          value={year}
          onChange={(e) => onYear(e.target.value)}
          className={selectCls(!!year)}
        >
          <option value="">YYYY</option>
          {Array.from({ length: currentYear - 1929 }, (_, i) => {
            const y = currentYear - i;
            return (
              <option key={y} value={String(y)}>
                {y}
              </option>
            );
          })}
        </select>
        <ChevronDown className="pointer-events-none absolute inset-e-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── PhoneInput ─────────────────────────────────────────────────────────────────

type PhoneInputProps = {
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  hasError?: boolean;
  placeholder?: string;
};

function PhoneInput({
  value,
  onChange,
  onBlur,
  hasError,
  placeholder = 'Local number',
}: PhoneInputProps) {
  const initial = parsePhone(value);
  const [selectedCode, setSelectedCode] = useState<PhoneCode>(initial.code);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  // Derive the local portion from the controlled value every render
  const localNumber = value.startsWith(selectedCode.dialCode)
    ? value.slice(selectedCode.dialCode.length)
    : value.startsWith('+')
      ? ''
      : value;

  const filtered = PHONE_CODES.filter(
    (c) =>
      c.country.toLowerCase().includes(search.toLowerCase()) ||
      c.dialCode.includes(search),
  );

  const handleCodeSelect = (code: PhoneCode) => {
    setSelectedCode(code);
    onChange(localNumber ? code.dialCode + localNumber : '');
    setSearch('');
    setOpen(false);
  };

  const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Strip anything that isn't a digit, space, dash, or paren
    const local = e.target.value.replace(/[^\d\s\-()+]/g, '');
    onChange(local ? selectedCode.dialCode + local : '');
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div
        className={cn(
          'flex h-9 w-full overflow-hidden rounded-lg border border-input bg-transparent text-sm transition-colors',
          'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
          hasError &&
            'border-destructive ring-3 ring-destructive/20 focus-within:border-destructive focus-within:ring-destructive/20',
        )}
      >
        {/* Country code trigger */}
        <PopoverTrigger
          className={cn(
            'flex shrink-0 items-center gap-1 border-e border-border bg-muted/40 px-2.5 text-sm transition-colors',
            'hover:bg-muted/70 focus-visible:outline-none',
          )}
        >
          <span className="text-base leading-none">{selectedCode.flag}</span>
          <span className="font-medium text-foreground">
            {selectedCode.dialCode}
          </span>
          <ChevronsUpDown className="size-3 shrink-0 text-muted-foreground" />
        </PopoverTrigger>

        {/* Local number */}
        <input
          type="tel"
          autoComplete="tel-local"
          placeholder={placeholder}
          value={localNumber}
          onChange={handleLocalChange}
          onBlur={onBlur}
          className="min-w-0 flex-1 bg-transparent px-2.5 outline-none placeholder:text-muted-foreground"
        />
      </div>

      {/* Country search popover */}
      <PopoverContent className="w-72 p-0" align="start" sideOffset={4}>
        <div className="border-b border-border p-2">
          <Input
            placeholder="Search country…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8"
            autoFocus
          />
        </div>
        <ul className="max-h-56 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <li className="px-2 py-4 text-center text-sm text-muted-foreground">
              No country found.
            </li>
          ) : (
            filtered.map((c) => (
              <li
                key={c.iso}
                onClick={() => handleCodeSelect(c)}
                className={cn(
                  'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  c.iso === selectedCode.iso &&
                    'bg-accent text-accent-foreground',
                )}
              >
                <span className="text-base">{c.flag}</span>
                <span className="flex-1 truncate">{c.country}</span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c.dialCode}
                </span>
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RegisterPage() {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const isSessionReady = useAuthStore((s) => s.isSessionReady);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionUser = useAuthStore((s) => s.user);
  const slug = useTenantStore((s) => s.slug);
  const isResolved = useTenantStore((s) => s.isResolved);
  const tenantInfo = useTenantStore((s) => s.tenantInfo);

  const [step, setStep] = useState(1);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    trigger,
    setValue,
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
      dateOfBirth: undefined,
      nationality: '',
      preferredLanguage: undefined,
      skillLevel: undefined,
      preferredPosition: undefined,
      dominantFoot: undefined,
    },
  });

  const passwordValue =
    useWatch({ control, name: 'password', defaultValue: '' }) ?? '';

  const skillLevel = useWatch({ control, name: 'skillLevel' });
  const preferredPosition = useWatch({ control, name: 'preferredPosition' });
  const dominantFoot = useWatch({ control, name: 'dominantFoot' });
  const preferredLanguage = useWatch({ control, name: 'preferredLanguage' });

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

  const handleNext = async () => {
    const valid = await trigger(STEP1_FIELDS);
    if (valid) {
      setServerError(null);
      setStep(2);
    }
  };

  const onSubmit = async (values: RegisterFormValues) => {
    setServerError(null);
    try {
      await registerRequest({
        name: values.name,
        email: values.email,
        password: values.password,
        phone: values.phone.trim(),
        dateOfBirth: values.dateOfBirth || undefined,
        nationality: values.nationality?.trim() || undefined,
        preferredLanguage: values.preferredLanguage || undefined,
        skillLevel: values.skillLevel,
        preferredPosition: values.preferredPosition,
        dominantFoot: values.dominantFoot,
      });
      navigate('/check-email', {
        replace: true,
        state: { email: values.email },
      });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setServerError(t('registerPage.errors.emailTaken'));
          setStep(1);
        } else if (err.statusCode === 403) {
          const msg = err.message.toLowerCase();
          if (msg.includes('tenant') || msg.includes('club')) {
            setServerError(t('registerPage.errors.inactiveTenant'));
          } else {
            setServerError(t('registerPage.errors.unknown'));
          }
        } else if (err.statusCode === 422) {
          if (err.errors?.length) {
            let wentToStep1 = false;
            for (const e of err.errors) {
              const tail = e.field.includes('.')
                ? e.field.split('.').pop()!
                : e.field;
              const key = BACKEND_FIELD_MAP[e.field] ?? BACKEND_FIELD_MAP[tail];
              if (key) {
                setError(key, { type: 'server', message: e.message });
                if (!wentToStep1) {
                  setStep(1);
                  wentToStep1 = true;
                }
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

  if (isAuthenticated && sessionUser?.role) {
    return <Navigate to={getRoleHomePath(sessionUser.role)} replace />;
  }

  if (slug === 'platform' || slug === null) {
    return <Navigate to="/login" replace />;
  }

  const SKILL_LEVELS = [
    {
      value: 'beginner' as const,
      icon: Sprout,
      label: t('registerPage.playerProfile.skillLevels.beginner'),
      desc: t('registerPage.playerProfile.skillLevels.beginnerDesc'),
    },
    {
      value: 'intermediate' as const,
      icon: Target,
      label: t('registerPage.playerProfile.skillLevels.intermediate'),
      desc: t('registerPage.playerProfile.skillLevels.intermediateDesc'),
    },
    {
      value: 'advanced' as const,
      icon: Trophy,
      label: t('registerPage.playerProfile.skillLevels.advanced'),
      desc: t('registerPage.playerProfile.skillLevels.advancedDesc'),
    },
  ];

  const POSITIONS = [
    {
      value: 'goalkeeper' as const,
      icon: Shield,
      label: t('registerPage.playerProfile.positions.goalkeeper'),
    },
    {
      value: 'defender' as const,
      icon: ShieldCheck,
      label: t('registerPage.playerProfile.positions.defender'),
    },
    {
      value: 'midfielder' as const,
      icon: Activity,
      label: t('registerPage.playerProfile.positions.midfielder'),
    },
    {
      value: 'forward' as const,
      icon: Flame,
      label: t('registerPage.playerProfile.positions.forward'),
    },
  ];

  const FEET = [
    { value: 'left', label: t('registerPage.playerProfile.feet.left') },
    { value: 'right', label: t('registerPage.playerProfile.feet.right') },
    { value: 'both', label: t('registerPage.playerProfile.feet.both') },
  ];

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PageControls />
      <div className="flex flex-1 flex-col items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          {/* Club logo + name */}
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
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">
                  {step === 1
                    ? t('registerPage.title')
                    : t('registerPage.playerProfile.title')}
                </CardTitle>
                <StepBar current={step} total={2} />
              </div>
              {step === 2 && (
                <p className="text-xs text-muted-foreground">
                  {t('registerPage.playerProfile.subtitle')}
                </p>
              )}
              {serverError && (
                <span
                  role="alert"
                  className="block rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/40 dark:bg-destructive/20"
                >
                  {serverError}
                </span>
              )}
            </CardHeader>

            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmit)}
                noValidate
                className="flex flex-col gap-4"
              >
                {/* ── Step 1: Account Info ──────────────────────────── */}
                {step === 1 && (
                  <>
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
                            ? t(
                                `registerPage.passwordStrength.${strength.label}`,
                              )
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
                      <label className="text-sm font-medium text-foreground">
                        {t('registerPage.phone')}
                      </label>
                      <Controller
                        name="phone"
                        control={control}
                        render={({ field, fieldState }) => (
                          <PhoneInput
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            hasError={!!fieldState.error}
                            placeholder={t('registerPage.phonePlaceholder')}
                          />
                        )}
                      />
                      {errors.phone && (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldMessage('phone')}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col gap-1">
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
                          I agree to the{' '}
                          <Link
                            to="/legal/terms"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Terms of Service
                          </Link>
                          ,{' '}
                          <Link
                            to="/legal/privacy"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Privacy Policy
                          </Link>{' '}
                          and{' '}
                          <Link
                            to="/legal/disclaimer"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                          >
                            Disclaimer
                          </Link>
                          .
                        </label>
                      </div>
                      {errors.acceptTerms && (
                        <p className="text-xs text-destructive" role="alert">
                          {fieldMessage('acceptTerms')}
                        </p>
                      )}
                    </div>

                    <Button
                      type="button"
                      size="lg"
                      className="w-full"
                      onClick={handleNext}
                    >
                      {t('registerPage.continueButton')}
                      <ChevronRight className="size-4" />
                    </Button>
                  </>
                )}

                {/* ── Step 2: Player Profile ────────────────────────── */}
                {step === 2 && (
                  <>
                    {/* Skill Level */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {t('registerPage.playerProfile.skillLevel')}
                      </span>
                      <div className="grid grid-cols-3 gap-2">
                        {SKILL_LEVELS.map((sl) => (
                          <OptionCard
                            key={sl.value}
                            icon={sl.icon}
                            label={sl.label}
                            description={sl.desc}
                            selected={skillLevel === sl.value}
                            onClick={() => {
                              if (skillLevel === sl.value) {
                                setValue('skillLevel', undefined);
                              } else {
                                setValue('skillLevel', sl.value, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Preferred Position */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {t('registerPage.playerProfile.preferredPosition')}
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        {POSITIONS.map((pos) => (
                          <OptionCard
                            key={pos.value}
                            icon={pos.icon}
                            label={pos.label}
                            selected={preferredPosition === pos.value}
                            onClick={() => {
                              if (preferredPosition === pos.value) {
                                setValue('preferredPosition', undefined);
                              } else {
                                setValue('preferredPosition', pos.value, {
                                  shouldDirty: true,
                                });
                              }
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Dominant Foot */}
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {t('registerPage.playerProfile.dominantFoot')}
                      </span>
                      <FootToggle
                        value={dominantFoot}
                        onChange={(v) => {
                          if (dominantFoot === v) {
                            setValue('dominantFoot', undefined);
                          } else {
                            setValue(
                              'dominantFoot',
                              v as 'left' | 'right' | 'both',
                              { shouldDirty: true },
                            );
                          }
                        }}
                        options={FEET}
                      />
                    </div>

                    {/* Divider */}
                    <div className="border-t border-border" />

                    {/* Date of Birth */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {t('registerPage.playerProfile.dateOfBirth')}
                        <span className="ms-1.5 text-xs font-normal text-muted-foreground">
                          ({t('registerPage.optional')})
                        </span>
                      </label>
                      <Controller
                        name="dateOfBirth"
                        control={control}
                        render={({ field }) => (
                          <BirthDateInput
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>

                    {/* Nationality + Language in a 2-col grid */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          {t('registerPage.playerProfile.nationality')}
                        </label>
                        <Controller
                          name="nationality"
                          control={control}
                          render={({ field }) => (
                            <SearchableCombobox
                              options={NATIONALITY_OPTIONS}
                              value={field.value ?? ''}
                              onChange={field.onChange}
                              placeholder={t(
                                'registerPage.playerProfile.nationalityPlaceholder',
                              )}
                              searchPlaceholder={t(
                                'registerPage.playerProfile.nationalitySearch',
                              )}
                              emptyLabel={t(
                                'registerPage.playerProfile.nationalityEmpty',
                              )}
                              allowClear
                              clearLabel={t(
                                'registerPage.playerProfile.nationalityNotSet',
                              )}
                            />
                          )}
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">
                          {t('registerPage.playerProfile.preferredLanguage')}
                        </label>
                        <Select
                          value={preferredLanguage ?? undefined}
                          onValueChange={(v) =>
                            setValue('preferredLanguage', v || undefined, {
                              shouldDirty: true,
                            })
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue
                              placeholder={t(
                                'registerPage.playerProfile.languagePlaceholder',
                              )}
                            />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">
                              {t('registerPage.playerProfile.languages.en')}
                            </SelectItem>
                            <SelectItem value="ar">
                              {t('registerPage.playerProfile.languages.ar')}
                            </SelectItem>
                            <SelectItem value="fr">
                              {t('registerPage.playerProfile.languages.fr')}
                            </SelectItem>
                            <SelectItem value="es">
                              {t('registerPage.playerProfile.languages.es')}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        className="flex-1"
                        onClick={() => setStep(1)}
                        disabled={isSubmitting}
                      >
                        <ChevronLeft className="size-4" />
                        {t('registerPage.backButton')}
                      </Button>
                      <Button
                        type="submit"
                        size="lg"
                        className="flex-2"
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
                    </div>
                  </>
                )}
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
