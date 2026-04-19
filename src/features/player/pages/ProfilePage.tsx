import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  Camera,
  KeyRound,
  Loader2,
  LogOut,
  Star,
  Target,
  Trash2,
  Trophy,
  User,
} from 'lucide-react';
import { useAuthControllerChangePassword } from '@/api/generated/auth/auth';
import type { ApiError } from '@/api/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DatePicker } from '@/components/ui/date-picker';
import { SearchableCombobox } from '@/components/ui/searchable-combobox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import {
  useUsersControllerGetMyProfile,
  useUsersControllerUpdateMyProfile,
  useUsersControllerUploadMyPhoto,
  useUsersControllerDeleteMyAccount,
  getUsersControllerGetMyProfileQueryKey,
} from '@/api/generated/users/users';
import type { UpdateMyProfileDto } from '@/api/generated/models/updateMyProfileDto';
import { UpdateMyProfileDtoSkillLevel } from '@/api/generated/models/updateMyProfileDtoSkillLevel';
import { UpdateMyProfileDtoPreferredPosition } from '@/api/generated/models/updateMyProfileDtoPreferredPosition';
import { UpdateMyProfileDtoDominantFoot } from '@/api/generated/models/updateMyProfileDtoDominantFoot';
import type { MyProfileResponseDto } from '@/api/generated/models/myProfileResponseDto';
import { useAuthStore } from '@/stores/authStore';
import { useLocaleStore } from '@/stores/localeStore';
import type { Locale } from '@/stores/localeStore';
import { NATIONALITY_OPTIONS } from '@/lib/nationalities';

// ── Schema ─────────────────────────────────────────────────────────────────────

const E164_RE = /^\+[1-9]\d{1,14}$/;

const ALL_DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;

const profileSchema = z.object({
  name: z.string().min(2, 'nameMin'),
  email: z.string().email('emailInvalid'),
  phone: z
    .string()
    .refine((v) => v === '' || E164_RE.test(v), { message: 'phoneInvalid' })
    .optional()
    .or(z.literal('')),
  // Football profile — all optional
  dateOfBirth: z.string().optional(),
  nationality: z
    .string()
    .max(100, 'nationalityMax')
    .optional()
    .or(z.literal('')),
  preferredLanguage: z.string().optional(),
  skillLevel: z.string().optional(),
  preferredPosition: z.string().optional(),
  dominantFoot: z.string().optional(),
  preferredDays: z.array(z.string()).optional(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'currentRequired'),
    newPassword: z.string().min(8, 'newMin'),
    confirmPassword: z.string(),
    revokeOtherSessions: z.boolean(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: 'confirmMismatch',
    path: ['confirmPassword'],
  });

type ChangePasswordFormValues = z.infer<typeof changePasswordSchema>;

// ── Helpers ────────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1 text-xs text-destructive">{message}</p>;
}

function FormLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
  );
}

// ── DaysToggle ─────────────────────────────────────────────────────────────────

type DaysToggleProps = {
  selected: string[];
  onChange: (days: string[]) => void;
  options: { value: string; label: string }[];
};

function DaysToggle({ selected, onChange, options }: DaysToggleProps) {
  function toggle(day: string) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt.value);
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggle(opt.value)}
            className={cn(
              'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
              active
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-foreground/25 hover:text-foreground',
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Stats section ──────────────────────────────────────────────────────────────

type StatsTileProps = {
  label: string;
  value: number;
  icon: React.ElementType;
  highlight?: boolean;
};

function StatsTile({ label, value, icon: Icon, highlight }: StatsTileProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-xl border p-3',
        highlight && value > 0
          ? 'border-primary/30 bg-primary/5'
          : 'border-border bg-muted/30',
      )}
    >
      <Icon
        className={cn(
          'size-4',
          highlight && value > 0 ? 'text-primary' : 'text-muted-foreground',
        )}
        aria-hidden
      />
      <span
        className={cn(
          'text-xl font-bold tabular-nums',
          highlight && value > 0 ? 'text-primary' : 'text-foreground',
        )}
      >
        {value}
      </span>
      <span className="text-center text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

function StatsSection({ stats }: { stats: MyProfileResponseDto['stats'] }) {
  const { t } = useTranslation('player');

  return (
    <Card>
      <CardHeader className="pb-3 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <Trophy className="size-4 text-primary" aria-hidden />
          {t('profile.stats.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-5">
        {/* W / L / D row */}
        <div className="mb-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
          <StatsTile
            label={t('profile.stats.matchesPlayed')}
            value={stats.matchesPlayed}
            icon={Target}
          />
          <StatsTile
            label={t('profile.stats.wins')}
            value={stats.wins}
            icon={Trophy}
            highlight
          />
          <StatsTile
            label={t('profile.stats.losses')}
            value={stats.losses}
            icon={Target}
          />
          <StatsTile
            label={t('profile.stats.draws')}
            value={stats.draws}
            icon={Target}
          />
          <StatsTile
            label={t('profile.stats.goals')}
            value={stats.goalsScored}
            icon={Target}
            highlight
          />
          <StatsTile
            label={t('profile.stats.assists')}
            value={stats.assists}
            icon={Star}
          />
          <StatsTile
            label={t('profile.stats.mvp')}
            value={stats.mvpAwards}
            icon={Star}
            highlight
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ── Avatar section ─────────────────────────────────────────────────────────────

type AvatarSectionProps = {
  name: string;
  photoUrl?: string | null;
  preview: string | null;
  onFileChange: (file: File) => void;
};

function AvatarSection({
  name,
  photoUrl,
  preview,
  onFileChange,
}: AvatarSectionProps) {
  const { t } = useTranslation('player');
  const inputRef = useRef<HTMLInputElement>(null);
  const src = preview ?? photoUrl ?? null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-muted ring-2 ring-border">
          {src ? (
            <img src={src} alt={name} className="size-full object-cover" />
          ) : (
            <span className="text-2xl font-semibold text-muted-foreground">
              {getInitials(name)}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="absolute bottom-0 right-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
          aria-label={t('profile.photo.change')}
        >
          <Camera className="size-3.5" aria-hidden />
        </button>
      </div>

      {preview && (
        <p className="text-xs text-muted-foreground">
          {t('profile.photo.previewNotice')}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileChange(file);
          e.target.value = '';
        }}
      />
    </div>
  );
}

// ── Profile form ───────────────────────────────────────────────────────────────

type ProfileFormProps = {
  defaultValues: ProfileFormValues;
  photoPreview: string | null;
  photoFile: File | null;
  onSuccess: (savedLanguage?: string) => void;
};

function ProfileForm({
  defaultValues,
  photoPreview,
  photoFile,
  onSuccess,
}: ProfileFormProps) {
  const { t } = useTranslation('player');
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);
  const setUser = useAuthStore((s) => s.setUser);
  const currentUser = useAuthStore((s) => s.user);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
  }, [defaultValues, reset]);

  const photoMutation = useUsersControllerUploadMyPhoto();
  const profileMutation = useUsersControllerUpdateMyProfile();

  const isPending = photoMutation.isPending || profileMutation.isPending;

  // Watched values for controlled Select / DatePicker
  /* eslint-disable react-hooks/incompatible-library */
  const dobValue = watch('dateOfBirth');
  const nationality = watch('nationality');
  const skillLevel = watch('skillLevel');
  const preferredPosition = watch('preferredPosition');
  const dominantFoot = watch('dominantFoot');
  const preferredLanguage = watch('preferredLanguage');
  const preferredDays = watch('preferredDays') ?? [];
  /* eslint-enable react-hooks/incompatible-library */

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    photoMutation.reset();
    profileMutation.reset();

    if (photoFile) {
      const res = await photoMutation.mutateAsync(
        { data: { photo: photoFile } },
        { onError: () => {} },
      );
      if (res.status >= 400) {
        setServerError(t('profile.form.photoError'));
        return;
      }
      // Sync new photoUrl into the auth store so the AppBar avatar updates immediately
      const newPhotoUrl = res.data?.data?.photoUrl;
      if (currentUser && newPhotoUrl) {
        setUser({ ...currentUser, photoUrl: newPhotoUrl });
      }
    }

    if (isDirty) {
      type ExtendedProfileDto = UpdateMyProfileDto & {
        preferredDays?: string[];
      };
      const res = await profileMutation.mutateAsync(
        {
          data: {
            name: values.name,
            email: values.email.trim(),
            phone: values.phone || undefined,
            dateOfBirth: values.dateOfBirth || undefined,
            nationality: values.nationality || undefined,
            preferredLanguage: values.preferredLanguage || undefined,
            skillLevel:
              (values.skillLevel as UpdateMyProfileDtoSkillLevel) || undefined,
            preferredPosition:
              (values.preferredPosition as UpdateMyProfileDtoPreferredPosition) ||
              undefined,
            dominantFoot:
              (values.dominantFoot as UpdateMyProfileDtoDominantFoot) ||
              undefined,
            preferredDays: values.preferredDays ?? [],
          } as ExtendedProfileDto,
        },
        { onError: () => {} },
      );
      if (res.status >= 400) {
        setServerError(t('profile.form.error'));
        return;
      }
      const newEmail =
        res.status === 200 && res.data?.data?.email
          ? res.data.data.email
          : values.email.trim();
      const baseUser = useAuthStore.getState().user ?? currentUser;
      if (baseUser) {
        setUser({ ...baseUser, email: newEmail });
      }
    }

    await queryClient.invalidateQueries({
      queryKey: getUsersControllerGetMyProfileQueryKey(),
    });
    onSuccess(values.preferredLanguage);
  }

  const dirty = isDirty || photoPreview !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">
        {/* ── Basic info ── */}
        <div className="flex flex-col gap-1.5">
          <FormLabel htmlFor="name">{t('profile.form.name')}</FormLabel>
          <Input id="name" {...register('name')} autoComplete="name" />
          <FieldError
            message={
              errors.name?.message
                ? t(`profile.form.validation.${errors.name.message}`)
                : undefined
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel htmlFor="email">{t('profile.form.email')}</FormLabel>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="w-full"
          />
          <FieldError
            message={
              errors.email?.message
                ? t(`profile.form.validation.${errors.email.message}`)
                : undefined
            }
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <FormLabel htmlFor="phone">{t('profile.form.phone')}</FormLabel>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            autoComplete="tel"
            placeholder={t('profile.form.phonePlaceholder')}
          />
          <FieldError
            message={
              errors.phone?.message
                ? t(`profile.form.validation.${errors.phone.message}`)
                : undefined
            }
          />
        </div>

        {/* ── Football Profile ── */}
        <div className="mt-2 flex flex-col gap-4 border-t pt-4">
          <div>
            <p className="text-sm font-semibold text-foreground">
              {t('profile.footballProfile.title')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('profile.footballProfile.subtitle')}
            </p>
          </div>

          {/* Date of birth */}
          <div className="flex flex-col gap-1.5">
            <FormLabel>{t('profile.footballProfile.dateOfBirth')}</FormLabel>
            <DatePicker
              value={dobValue ? parseISO(dobValue) : undefined}
              onChange={(date) => {
                setValue(
                  'dateOfBirth',
                  date ? format(date, 'yyyy-MM-dd') : '',
                  { shouldDirty: true },
                );
              }}
              placeholder={t('profile.footballProfile.dateOfBirthPlaceholder')}
              toDate={new Date()}
            />
          </div>

          {/* Nationality — searchable combobox */}
          <div className="flex flex-col gap-1.5">
            <FormLabel>{t('profile.footballProfile.nationality')}</FormLabel>
            <SearchableCombobox
              options={NATIONALITY_OPTIONS}
              value={nationality ?? ''}
              onChange={(v) =>
                setValue('nationality', v, {
                  shouldDirty: true,
                  shouldValidate: true,
                })
              }
              placeholder={t('profile.footballProfile.nationalityPlaceholder')}
              searchPlaceholder={t('profile.footballProfile.nationalitySearch')}
              emptyLabel={t('profile.footballProfile.nationalityEmpty')}
              hasError={!!errors.nationality}
              allowClear
              clearLabel={t('profile.footballProfile.notSet')}
            />
            <FieldError
              message={
                errors.nationality?.message
                  ? t(`profile.form.validation.${errors.nationality.message}`)
                  : undefined
              }
            />
          </div>

          {/* Skill level + Preferred position in a 2-col row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <FormLabel>{t('profile.footballProfile.skillLevel')}</FormLabel>
              <Select
                value={skillLevel || undefined}
                onValueChange={(v) =>
                  setValue('skillLevel', v ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('profile.footballProfile.notSet')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UpdateMyProfileDtoSkillLevel).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`profile.footballProfile.skillLevels.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FormLabel>
                {t('profile.footballProfile.preferredPosition')}
              </FormLabel>
              <Select
                value={preferredPosition || undefined}
                onValueChange={(v) =>
                  setValue('preferredPosition', v ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('profile.footballProfile.notSet')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UpdateMyProfileDtoPreferredPosition).map(
                    (v) => (
                      <SelectItem key={v} value={v}>
                        {t(`profile.footballProfile.positions.${v}`)}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Dominant foot + Preferred language in a 2-col row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <FormLabel>{t('profile.footballProfile.dominantFoot')}</FormLabel>
              <Select
                value={dominantFoot || undefined}
                onValueChange={(v) =>
                  setValue('dominantFoot', v ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('profile.footballProfile.notSet')}
                  />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(UpdateMyProfileDtoDominantFoot).map((v) => (
                    <SelectItem key={v} value={v}>
                      {t(`profile.footballProfile.feet.${v}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <FormLabel>
                {t('profile.footballProfile.preferredLanguage')}
              </FormLabel>
              <Select
                value={preferredLanguage || undefined}
                onValueChange={(v) =>
                  setValue('preferredLanguage', v ?? '', {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={t('profile.footballProfile.notSet')}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">
                    {t('profile.footballProfile.languages.en')}
                  </SelectItem>
                  <SelectItem value="ar">
                    {t('profile.footballProfile.languages.ar')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Preferred Days */}
          <div className="flex flex-col gap-1.5">
            <FormLabel>{t('profile.footballProfile.preferredDays')}</FormLabel>
            <DaysToggle
              selected={preferredDays as string[]}
              onChange={(days) =>
                setValue('preferredDays', days, {
                  shouldDirty: true,
                })
              }
              options={ALL_DAYS.map((d) => ({
                value: d,
                label: t(`profile.footballProfile.days.${d}`),
              }))}
            />
          </div>
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        <Button type="submit" disabled={!dirty || isPending} className="w-fit">
          {isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {t('profile.form.save')}
        </Button>
      </div>
    </form>
  );
}

// ── Password section ───────────────────────────────────────────────────────────

function PasswordSection() {
  const { t } = useTranslation('player');
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
      revokeOtherSessions: false,
    },
  });

  const mutation = useAuthControllerChangePassword({
    mutation: {
      onSuccess: () => {
        setSuccess(true);
        setServerError(null);
        reset();
      },
      onError: (err: unknown) => {
        const status = (err as ApiError | null)?.statusCode;
        if (status === 401) {
          setServerError(t('profile.password.errorIncorrect'));
        } else {
          setServerError(t('profile.password.errorGeneric'));
        }
      },
    },
  });

  function onSubmit(values: ChangePasswordFormValues) {
    setServerError(null);
    setSuccess(false);
    mutation.mutate({
      data: {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
        revokeOtherSessions: values.revokeOtherSessions,
      },
    });
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-4 text-muted-foreground" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">
            {t('profile.password.title')}
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="current-password">
              {t('profile.password.current')}
            </FormLabel>
            <Input
              id="current-password"
              type="password"
              autoComplete="current-password"
              {...register('currentPassword')}
            />
            <FieldError
              message={
                errors.currentPassword?.message
                  ? t(
                      `profile.password.validation.${errors.currentPassword.message}`,
                    )
                  : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="new-password">
              {t('profile.password.new')}
            </FormLabel>
            <Input
              id="new-password"
              type="password"
              autoComplete="new-password"
              {...register('newPassword')}
            />
            <FieldError
              message={
                errors.newPassword?.message
                  ? t(
                      `profile.password.validation.${errors.newPassword.message}`,
                    )
                  : undefined
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <FormLabel htmlFor="confirm-password">
              {t('profile.password.confirm')}
            </FormLabel>
            <Input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            <FieldError
              message={
                errors.confirmPassword?.message
                  ? t(
                      `profile.password.validation.${errors.confirmPassword.message}`,
                    )
                  : undefined
              }
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 rounded border-border accent-primary"
              {...register('revokeOtherSessions')}
            />
            {t('profile.password.revokeOtherSessions')}
          </label>
        </div>

        {serverError && (
          <p
            role="alert"
            className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400"
          >
            {t('profile.password.success')}
          </p>
        )}

        <Button
          type="submit"
          variant="outline"
          disabled={mutation.isPending}
          className="w-fit"
        >
          {mutation.isPending && (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          )}
          {t('profile.password.changeBtn')}
        </Button>
      </div>
    </form>
  );
}

// ── Delete account section ─────────────────────────────────────────────────────

type DeleteAccountSectionProps = {
  onDeleted: () => void;
};

function DeleteAccountSection({ onDeleted }: DeleteAccountSectionProps) {
  const { t } = useTranslation('player');
  const [open, setOpen] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const mutation = useUsersControllerDeleteMyAccount({
    mutation: {
      onSuccess: () => {
        setOpen(false);
        onDeleted();
      },
      onError: (err: unknown) => {
        const status = (err as { statusCode?: number } | null)?.statusCode;
        if (status === 409) {
          setServerError(t('profile.delete.errorUpcomingBookings'));
        } else {
          setServerError(t('profile.delete.errorGeneric'));
        }
      },
    },
  });

  function handleConfirm() {
    setServerError(null);
    mutation.mutate();
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Trash2 className="size-4 text-destructive" aria-hidden />
          <h2 className="text-base font-semibold text-foreground">
            {t('profile.delete.title')}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('profile.delete.warning')}
        </p>
        <Button
          type="button"
          variant="destructive"
          className="w-fit"
          onClick={() => {
            setServerError(null);
            setOpen(true);
          }}
        >
          <Trash2 className="size-4" aria-hidden />
          {t('profile.delete.btn')}
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('profile.delete.modal.title')}</DialogTitle>
          </DialogHeader>

          <p className="text-sm text-muted-foreground">
            {t('profile.delete.modal.body')}
          </p>

          {serverError && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {serverError}
            </p>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              {t('profile.delete.modal.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={mutation.isPending}
            >
              {mutation.isPending && (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              )}
              {t('profile.delete.modal.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ── Page skeleton ──────────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-28 w-full rounded-xl" />
      <Card>
        <CardContent className="flex flex-col items-center gap-4 p-6">
          <Skeleton className="size-24 rounded-full" />
          <div className="w-full space-y-3">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-9 w-24" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { t } = useTranslation('player');
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);
  const setLocale = useLocaleStore((s) => s.setLocale);

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data, isLoading, isError } = useUsersControllerGetMyProfile();

  const profile = data?.status === 200 ? data.data.data : null;

  function handleFileChange(file: File) {
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    setSaveSuccess(false);
  }

  function handleSaveSuccess(savedLanguage?: string) {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setSaveSuccess(true);

    if (savedLanguage === 'en' || savedLanguage === 'ar') {
      setLocale(savedLanguage as Locale);
    }
  }

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  async function handleDeleted() {
    await logout();
    navigate('/login', { replace: true });
  }

  if (isLoading) return <ProfileSkeleton />;

  if (isError || !profile) {
    return (
      <div className="p-4 md:p-6">
        <p
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {t('profile.loadError')}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <User className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">
          {t('profile.pageTitle')}
        </h1>
      </div>

      {/* Stats */}
      <StatsSection stats={profile.stats} />

      {/* Profile info + form */}
      <Card>
        <CardContent className="flex flex-col gap-6 p-6">
          <AvatarSection
            name={profile.name}
            photoUrl={profile.photoUrl}
            preview={photoPreview}
            onFileChange={handleFileChange}
          />

          {saveSuccess && (
            <p
              role="status"
              className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-center text-sm text-emerald-600 dark:text-emerald-400"
            >
              {t('profile.form.saveSuccess')}
            </p>
          )}

          <ProfileForm
            defaultValues={{
              name: profile.name,
              email: profile.email,
              phone: profile.phone ?? '',
              dateOfBirth: profile.dateOfBirth ?? '',
              nationality: profile.nationality ?? '',
              preferredLanguage: profile.preferredLanguage ?? '',
              skillLevel: profile.skillLevel ?? '',
              preferredPosition: profile.preferredPosition ?? '',
              dominantFoot: profile.dominantFoot ?? '',
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              preferredDays: (profile as any).preferredDays ?? [],
            }}
            photoPreview={photoPreview}
            photoFile={photoFile}
            onSuccess={handleSaveSuccess}
          />
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardContent className={cn('p-6')}>
          <PasswordSection />
        </CardContent>
      </Card>

      {/* Delete account */}
      <Card className="border-destructive/40">
        <CardContent className="p-6">
          <DeleteAccountSection onDeleted={handleDeleted} />
        </CardContent>
      </Card>

      <Button
        variant="outline"
        className="w-full text-muted-foreground hover:text-destructive"
        onClick={handleLogout}
      >
        <LogOut className="size-4" aria-hidden />
        {t('profile.logout')}
      </Button>
    </div>
  );
}
