import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, Settings, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { apiFetch } from '@/api/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { unwrap, ApiError } from '@/api';
import {
  useTenantSettingsControllerGetSettings,
  useTenantSettingsControllerUpdateSettings,
  getTenantSettingsControllerGetSettingsQueryKey,
} from '@/api/generated/tenant-settings/tenant-settings';
import { useTenantStore } from '@/stores/tenantStore';

import { useQueryClient } from '@tanstack/react-query';

// ── Timezone list ─────────────────────────────────────────────────────────────

const ALL_TIMEZONES: string[] = (() => {
  try {
    return Intl.supportedValuesOf('timeZone');
  } catch {
    return [
      'UTC',
      'Africa/Cairo',
      'America/Chicago',
      'America/Los_Angeles',
      'America/New_York',
      'America/Sao_Paulo',
      'Asia/Baghdad',
      'Asia/Bangkok',
      'Asia/Damascus',
      'Asia/Kolkata',
      'Asia/Riyadh',
      'Asia/Seoul',
      'Asia/Shanghai',
      'Asia/Singapore',
      'Asia/Tehran',
      'Asia/Tokyo',
      'Australia/Sydney',
      'Europe/Amsterdam',
      'Europe/Berlin',
      'Europe/Istanbul',
      'Europe/London',
      'Europe/Moscow',
      'Europe/Paris',
      'Pacific/Auckland',
    ];
  }
})();

// ── Schemas ───────────────────────────────────────────────────────────────────

const generalSchema = z.object({
  name: z.string().min(1, 'settings.general.name'),
  logoUrl: z
    .string()
    .url('settings.general.logoUrl')
    .or(z.literal(''))
    .optional(),
  timezone: z.string().min(1, 'settings.general.timezone'),
  cancelCutoffHours: z.number().int().min(0).max(8760),
});

const ziinaSchema = z.object({
  ziinaAccessToken: z.string().min(10, 'settings.ziina.tokenPlaceholder'),
});

type GeneralFormValues = z.infer<typeof generalSchema>;
type ZiinaFormValues = z.infer<typeof ziinaSchema>;

// ── CancelCutoffField ─────────────────────────────────────────────────────────

const CUTOFF_PRESETS = [
  { label: 'None', value: 0 },
  { label: '1 h', value: 1 },
  { label: '2 h', value: 2 },
  { label: '6 h', value: 6 },
  { label: '12 h', value: 12 },
  { label: '24 h', value: 24 },
  { label: '48 h', value: 48 },
];

function formatCutoff(hours: number): string {
  if (hours === 0) return 'Cancellations allowed up until the match starts.';
  if (hours < 24)
    return `Cancellations must be made at least ${hours} hour${hours === 1 ? '' : 's'} before the match.`;
  const days = hours / 24;
  if (Number.isInteger(days))
    return `Cancellations must be made at least ${days} day${days === 1 ? '' : 's'} before the match.`;
  return `Cancellations must be made at least ${hours} hours before the match.`;
}

interface CancelCutoffFieldProps {
  value: number;
  onChange: (v: number) => void;
  error?: string;
  label: string;
  hint: string;
}

function CancelCutoffField({
  value,
  onChange,
  error,
  label,
}: CancelCutoffFieldProps) {
  const activePreset = CUTOFF_PRESETS.find((p) => p.value === value);

  return (
    <div className="flex flex-col gap-2">
      <Label>{label}</Label>

      {/* Preset chips */}
      <div className="flex flex-wrap gap-1.5">
        {CUTOFF_PRESETS.map((preset) => (
          <button
            key={preset.value}
            type="button"
            onClick={() => onChange(preset.value)}
            className={[
              'rounded-md border px-3 py-1 text-xs font-medium transition-colors',
              value === preset.value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground',
            ].join(' ')}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom input shown when no preset matches */}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          max={8760}
          value={isNaN(value) ? '' : value}
          onChange={(e) => {
            const n = parseInt(e.target.value, 10);
            if (!isNaN(n) && n >= 0 && n <= 8760) onChange(n);
          }}
          className="h-8 w-24 text-sm"
        />
        <span className="text-sm text-muted-foreground">hours</span>
        {!activePreset && value > 0 && (
          <span className="text-xs text-muted-foreground">
            ({(value / 24).toFixed(1)} days)
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {formatCutoff(isNaN(value) ? 0 : value)}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

// ── GeneralSettingsCard ───────────────────────────────────────────────────────

interface GeneralSettingsCardProps {
  slug: string;
  defaultValues: GeneralFormValues;
}

function GeneralSettingsCard({
  slug,
  defaultValues,
}: GeneralSettingsCardProps) {
  const { t } = useTranslation('operator');
  const queryClient = useQueryClient();
  const [tzSearch, setTzSearch] = useState('');

  const filteredTz = useMemo(
    () =>
      tzSearch.trim()
        ? ALL_TIMEZONES.filter((tz) =>
            tz.toLowerCase().includes(tzSearch.toLowerCase()),
          )
        : ALL_TIMEZONES,
    [tzSearch],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<GeneralFormValues>({
    resolver: zodResolver(generalSchema),
    defaultValues,
  });

  // Re-sync when parent loads fresh data

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValues.name, defaultValues.timezone]);

  const timezone = watch('timezone');

  const mutation = useTenantSettingsControllerUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast.success(t('settings.general.success'));
        queryClient.invalidateQueries({
          queryKey: getTenantSettingsControllerGetSettingsQueryKey(),
        });
      },
      onError: () => toast.error(t('settings.general.error.generic')),
    },
  });

  function onSubmit(values: GeneralFormValues) {
    mutation.mutate({
      data: {
        name: values.name,
        timezone: values.timezone,
        cancelCutoffHours: values.cancelCutoffHours,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        logoUrl: (values.logoUrl || null) as any,
      },
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-6 text-base font-semibold text-foreground">
          {t('settings.general.title')}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-name">{t('settings.general.name')}</Label>
            <Input id="settings-name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">
                {t('settings.general.name')}
              </p>
            )}
          </div>

          {/* Slug — read-only */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('settings.general.slug')}</Label>
            <div className="flex items-center gap-2">
              <code className="rounded-md border border-border bg-muted px-3 py-2 text-sm text-muted-foreground">
                {slug}
              </code>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('settings.general.slugHint')}
            </p>
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="settings-logo">
              {t('settings.general.logoUrl')}
            </Label>
            <Input
              id="settings-logo"
              type="url"
              {...register('logoUrl')}
              placeholder={t('settings.general.logoUrlPlaceholder')}
            />
            {errors.logoUrl && (
              <p className="text-xs text-destructive">
                {errors.logoUrl.message}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('settings.general.timezone')}</Label>
            <Select
              value={timezone}
              onValueChange={(v) =>
                setValue('timezone', v || '', {
                  shouldValidate: true,
                  shouldDirty: true,
                })
              }
              onOpenChange={(open) => {
                if (!open) setTzSearch('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.general.timezone')} />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5">
                  <Input
                    placeholder={t('settings.general.timezoneSearch')}
                    value={tzSearch}
                    onChange={(e) => setTzSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="h-8 text-sm"
                    autoFocus
                  />
                </div>
                {filteredTz.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {t('settings.general.timezoneEmpty')}
                  </p>
                ) : (
                  filteredTz.map((tz) => (
                    <SelectItem key={tz} value={tz}>
                      {tz}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {errors.timezone && (
              <p className="text-xs text-destructive">
                {t('settings.general.timezone')}
              </p>
            )}
          </div>

          {/* Cancellation cutoff */}
          <CancelCutoffField
            value={watch('cancelCutoffHours')}
            onChange={(v) =>
              setValue('cancelCutoffHours', v, {
                shouldDirty: true,
                shouldValidate: true,
              })
            }
            error={errors.cancelCutoffHours?.message}
            label={t('settings.general.cancelCutoffHours')}
            hint={t('settings.general.cancelCutoffHint')}
          />

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !isDirty}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {t('settings.general.saving')}
                </>
              ) : (
                t('settings.general.save')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── LogoUploadCard ────────────────────────────────────────────────────────────

function LogoUploadCard() {
  const { t } = useTranslation('operator');
  const queryClient = useQueryClient();
  const setTenantInfo = useTenantStore((s) => s.setTenantInfo);
  const tenantInfo = useTenantStore((s) => s.tenantInfo);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);

  async function handleFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setUploading(true);
    try {
      const form = new FormData();
      form.append('logo', file);
      const res = await apiFetch('/tenant/settings/logo', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) throw new Error('upload failed');
      const json = (await res.json().catch(() => null)) as {
        data?: { logoUrl?: string | null; name?: string; slug?: string };
      } | null;
      // Sync AppBar logo immediately
      if (tenantInfo && json?.data?.logoUrl !== undefined) {
        setTenantInfo({ ...tenantInfo, logoUrl: json.data.logoUrl ?? null });
      }
      toast.success(t('settings.general.logoUploadSuccess'));
      queryClient.invalidateQueries({
        queryKey: getTenantSettingsControllerGetSettingsQueryKey(),
      });
    } catch {
      toast.error(t('settings.general.logoUploadError'));
      URL.revokeObjectURL(objectUrl);
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-2 text-base font-semibold text-foreground">
          {t('settings.general.logoUpload')}
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          {t('settings.general.logoUploadHint')}
        </p>

        <div className="flex items-center gap-4">
          {preview && (
            <img
              src={preview}
              alt="logo preview"
              className="h-12 w-12 rounded-lg object-cover ring-1 ring-border"
            />
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                {t('settings.general.logoUploading')}
              </>
            ) : (
              <>
                <Upload className="me-2 size-4" aria-hidden />
                {t('settings.general.logoUploadLabel')}
              </>
            )}
          </Button>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = '';
          }}
        />
      </CardContent>
    </Card>
  );
}

// ── ZiinaCard ─────────────────────────────────────────────────────────────────

function ZiinaCard() {
  const { t } = useTranslation('operator');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ZiinaFormValues>({
    resolver: zodResolver(ziinaSchema),
  });

  const mutation = useTenantSettingsControllerUpdateSettings({
    mutation: {
      onSuccess: () => {
        toast.success(t('settings.ziina.success'));
        reset();
      },
      onError: (err: unknown) => {
        toast.error(
          err instanceof ApiError && err.statusCode === 422
            ? t('settings.ziina.error.invalid')
            : t('settings.ziina.error.generic'),
        );
      },
    },
  });

  function onSubmit(values: ZiinaFormValues) {
    mutation.mutate({
      data: { ziinaAccessToken: values.ziinaAccessToken } as Parameters<
        typeof mutation.mutate
      >[0]['data'],
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-1.5 mb-6">
          <h2 className="text-base font-semibold text-foreground">
            {t('settings.ziina.title')}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t('settings.ziina.description')}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ziina-token">
              {t('settings.ziina.tokenLabel')}
            </Label>
            <Input
              id="ziina-token"
              type="password"
              autoComplete="off"
              placeholder={t('settings.ziina.tokenPlaceholder')}
              {...register('ziinaAccessToken')}
            />
            {errors.ziinaAccessToken && (
              <p className="text-xs text-destructive">
                {t('settings.ziina.tokenPlaceholder')}
              </p>
            )}
          </div>

          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {t('settings.ziina.scopesHint')}
            <a
              href="https://ziina.com/business/connect"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-0.5 text-primary underline underline-offset-2 hover:no-underline"
            >
              ziina.com/business/connect
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </p>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                  {t('settings.ziina.saving')}
                </>
              ) : (
                t('settings.ziina.save')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── TenantSettingsPage ────────────────────────────────────────────────────────

export function TenantSettingsPage() {
  const { t } = useTranslation('operator');

  const {
    data: raw,
    isLoading,
    isError,
  } = useTenantSettingsControllerGetSettings();
  const settings = unwrap(raw);

  const generalDefaults: GeneralFormValues = {
    name: settings?.name ?? '',
    logoUrl: (settings?.logoUrl as string | undefined) ?? '',
    timezone: settings?.timezone ?? 'UTC',
    cancelCutoffHours: settings?.cancelCutoffHours ?? 0,
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">
          {t('settings.title')}
        </h1>
      </div>

      {isError && (
        <p className="text-sm text-destructive">
          {t('settings.general.error.load')}
        </p>
      )}

      {isLoading ? (
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
          </CardContent>
        </Card>
      ) : (
        <GeneralSettingsCard
          slug={settings?.slug ?? ''}
          defaultValues={generalDefaults}
        />
      )}

      <LogoUploadCard />

      <ZiinaCard />
    </div>
  );
}
