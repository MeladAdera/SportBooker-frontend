import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Camera, KeyRound, Loader2, LogOut, Trash2, User } from 'lucide-react';
import { useAuthControllerChangePassword } from '@/api/generated/auth/auth';
import type { ApiError } from '@/api/client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
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
import { useAuthStore } from '@/stores/authStore';

// ── Schema ─────────────────────────────────────────────────────────────────────

const E164_RE = /^\+[1-9]\d{1,14}$/;

const profileSchema = z.object({
  name: z.string().min(2, 'nameMin'),
  phone: z
    .string()
    .refine((v) => v === '' || E164_RE.test(v), { message: 'phoneInvalid' })
    .optional()
    .or(z.literal('')),
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
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
      {children}
    </label>
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
  email: string;
  photoPreview: string | null;
  photoFile: File | null;
  onSuccess: () => void;
};

function ProfileForm({
  defaultValues,
  email,
  photoPreview,
  photoFile,
  onSuccess,
}: ProfileFormProps) {
  const { t } = useTranslation('player');
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
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

  async function onSubmit(values: ProfileFormValues) {
    setServerError(null);
    photoMutation.reset();
    profileMutation.reset();

    // Step 1: upload photo if a new file was picked
    if (photoFile) {
      const res = await photoMutation.mutateAsync(
        { data: { photo: photoFile } },
        { onError: () => {} },
      );
      if (res.status >= 400) {
        setServerError(t('profile.form.photoError'));
        return;
      }
    }

    // Step 2: patch text fields only if dirty
    if (isDirty) {
      const res = await profileMutation.mutateAsync(
        {
          data: {
            name: values.name,
            phone: values.phone || undefined,
          },
        },
        { onError: () => {} },
      );
      if (res.status >= 400) {
        setServerError(t('profile.form.error'));
        return;
      }
    }

    await queryClient.invalidateQueries({
      queryKey: getUsersControllerGetMyProfileQueryKey(),
    });
    onSuccess();
  }

  const dirty = isDirty || photoPreview !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <div className="flex flex-col gap-4">
        {/* Name */}
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

        {/* Email — read-only */}
        <div className="flex flex-col gap-1.5">
          <FormLabel htmlFor="email">{t('profile.form.email')}</FormLabel>
          <div className="flex items-center gap-2">
            <Input
              id="email"
              type="email"
              value={email}
              readOnly
              disabled
              className="flex-1"
            />
            <Badge variant="secondary" className="shrink-0 text-xs">
              {t('profile.form.emailReadOnly')}
            </Badge>
          </div>
        </div>

        {/* Phone */}
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
        const status = (err as { status?: number } | null)?.status;
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

  function handleSaveSuccess() {
    setPhotoFile(null);
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview);
      setPhotoPreview(null);
    }
    setSaveSuccess(true);
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <User className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-semibold text-foreground">
            {t('profile.pageTitle')}
          </h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleLogout}
          className="text-muted-foreground hover:text-destructive"
        >
          <LogOut className="size-4" aria-hidden />
          {t('profile.logout')}
        </Button>
      </div>

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
              phone: profile.phone ?? '',
            }}
            email={profile.email}
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
    </div>
  );
}
