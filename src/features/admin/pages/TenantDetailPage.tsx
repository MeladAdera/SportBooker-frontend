import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Loader2,
  Upload,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  adminTenantsKeys,
  activateTenant,
  deactivateTenant,
  getTenant,
  updateTenant,
  uploadTenantLogo,
  type UpdateTenantDto,
  type TenantDetail,
} from '../api';

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
      'Asia/Baghdad',
      'Asia/Dubai',
      'Asia/Kolkata',
      'Asia/Riyadh',
      'Asia/Tokyo',
      'Europe/Berlin',
      'Europe/Istanbul',
      'Europe/London',
      'Europe/Paris',
    ];
  }
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── Settings form ─────────────────────────────────────────────────────────────

const settingsSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  logoUrl: z.string().url().or(z.literal('')).optional(),
  cancelCutoffHours: z.number().int().min(0).max(8760),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

interface SettingsCardProps {
  tenant: TenantDetail;
}

function SettingsCard({ tenant }: SettingsCardProps) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();
  const [tzSearch, setTzSearch] = useState('');
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const filteredTz = useMemo(
    () =>
      tzSearch.trim()
        ? ALL_TIMEZONES.filter((tz) =>
            tz.toLowerCase().includes(tzSearch.toLowerCase()),
          )
        : ALL_TIMEZONES,
    [tzSearch],
  );

  const defaultValues: SettingsFormValues = {
    name: tenant.name,
    timezone: tenant.timezone ?? 'UTC',
    logoUrl: tenant.logoUrl ?? '',
    cancelCutoffHours: tenant.cancelCutoffHours ?? 0,
  };

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues,
  });

  useEffect(() => {
    reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.name, tenant.timezone, tenant.logoUrl, tenant.cancelCutoffHours]);

  const timezone = watch('timezone');

  const mutation = useMutation({
    mutationFn: (dto: UpdateTenantDto) => updateTenant(tenant.id, dto),
    onSuccess: (updated) => {
      toast.success(t('tenantDetail.settings.success'));
      queryClient.setQueryData(adminTenantsKeys.detail(tenant.id), updated);
      queryClient.invalidateQueries({ queryKey: adminTenantsKeys.all });
    },
    onError: () => toast.error(t('tenantDetail.settings.error.generic')),
  });

  async function handleLogoFile(file: File) {
    const objectUrl = URL.createObjectURL(file);
    setLogoPreview(objectUrl);
    setLogoUploading(true);
    try {
      const updated = await uploadTenantLogo(tenant.id, file);
      toast.success(t('tenantDetail.settings.logoUploadSuccess'));
      queryClient.setQueryData(adminTenantsKeys.detail(tenant.id), updated);
      queryClient.invalidateQueries({ queryKey: adminTenantsKeys.all });
    } catch {
      toast.error(t('tenantDetail.settings.logoUploadError'));
      URL.revokeObjectURL(objectUrl);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
    }
  }

  function onSubmit(values: SettingsFormValues) {
    mutation.mutate({
      name: values.name,
      timezone: values.timezone,
      logoUrl: values.logoUrl || null,
      cancelCutoffHours: values.cancelCutoffHours,
    });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-6 text-base font-semibold text-foreground">
          {t('tenantDetail.settings.title')}
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-name">{t('tenantDetail.settings.name')}</Label>
            <Input id="td-name" {...register('name')} />
            {errors.name && (
              <p className="text-xs text-destructive">
                {t('tenantDetail.settings.name')}
              </p>
            )}
          </div>

          {/* Timezone */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('tenantDetail.settings.timezone')}</Label>
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
                <SelectValue
                  placeholder={t('tenantDetail.settings.timezone')}
                />
              </SelectTrigger>
              <SelectContent>
                <div className="px-2 py-1.5">
                  <Input
                    placeholder={t('tenantDetail.settings.timezoneSearch')}
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
                    {t('tenantDetail.settings.timezoneEmpty')}
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
                {t('tenantDetail.settings.timezone')}
              </p>
            )}
          </div>

          {/* Logo URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-logo">
              {t('tenantDetail.settings.logoUrl')}
            </Label>
            <Input
              id="td-logo"
              type="url"
              placeholder={t('tenantDetail.settings.logoUrlPlaceholder')}
              {...register('logoUrl')}
            />
            {errors.logoUrl && (
              <p className="text-xs text-destructive">
                {errors.logoUrl.message}
              </p>
            )}
          </div>

          {/* Logo file upload */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('tenantDetail.settings.logoUploadLabel')}</Label>
            <p className="text-xs text-muted-foreground">
              {t('tenantDetail.settings.logoUploadHint')}
            </p>
            <div className="flex items-center gap-3">
              {(logoPreview ?? tenant.logoUrl) && (
                <img
                  src={logoPreview ?? tenant.logoUrl ?? undefined}
                  alt="logo"
                  className="h-10 w-10 rounded-lg object-cover ring-1 ring-border"
                />
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
              >
                {logoUploading ? (
                  <>
                    <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                    {t('tenantDetail.settings.logoUploading')}
                  </>
                ) : (
                  <>
                    <Upload className="me-2 size-4" aria-hidden />
                    {t('tenantDetail.settings.logoUpload')}
                  </>
                )}
              </Button>
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleLogoFile(file);
                e.target.value = '';
              }}
            />
          </div>

          {/* Cancel Cutoff */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="td-cutoff">
              {t('tenantDetail.settings.cancelCutoffHours')}
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="td-cutoff"
                type="number"
                min={0}
                max={8760}
                className="h-9 w-28"
                value={watch('cancelCutoffHours')}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!isNaN(n) && n >= 0 && n <= 8760) {
                    setValue('cancelCutoffHours', n, {
                      shouldDirty: true,
                      shouldValidate: true,
                    });
                  }
                }}
              />
              <span className="text-sm text-muted-foreground">hours</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('tenantDetail.settings.cancelCutoffHint')}
            </p>
            {errors.cancelCutoffHours && (
              <p className="text-xs text-destructive">
                {errors.cancelCutoffHours.message}
              </p>
            )}
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={mutation.isPending || !isDirty}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                  {t('tenantDetail.settings.saving')}
                </>
              ) : (
                t('tenantDetail.settings.save')
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ── ActivationCard ────────────────────────────────────────────────────────────

interface ActivationCardProps {
  tenant: TenantDetail;
}

function ActivationCard({ tenant }: ActivationCardProps) {
  const { t } = useTranslation('admin');
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: () =>
      tenant.isActive ? deactivateTenant(tenant.id) : activateTenant(tenant.id),
    onSuccess: (updated) => {
      toast.success(
        tenant.isActive
          ? t('tenantDetail.activation.deactivateSuccess')
          : t('tenantDetail.activation.activateSuccess'),
      );
      queryClient.setQueryData(adminTenantsKeys.detail(tenant.id), updated);
      queryClient.invalidateQueries({ queryKey: adminTenantsKeys.all });
    },
    onError: () => toast.error(t('tenantDetail.activation.error')),
  });

  function handleToggle() {
    const confirmMsg = tenant.isActive
      ? t('tenantDetail.activation.confirmDeactivate')
      : t('tenantDetail.activation.confirmActivate');
    if (!window.confirm(confirmMsg)) return;
    mutation.mutate();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('tenantDetail.activation.title')}
        </h2>

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
              {tenant.isActive
                ? t('tenants.status.active')
                : t('tenants.status.inactive')}
            </Badge>
            <p className="text-sm text-muted-foreground">
              {tenant.isActive
                ? t('tenantDetail.activation.activeDescription')
                : t('tenantDetail.activation.inactiveDescription')}
            </p>
          </div>

          <Button
            variant={tenant.isActive ? 'destructive' : 'default'}
            size="sm"
            disabled={mutation.isPending}
            onClick={handleToggle}
            className="shrink-0"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                {tenant.isActive
                  ? t('tenantDetail.activation.deactivating')
                  : t('tenantDetail.activation.activating')}
              </>
            ) : tenant.isActive ? (
              t('tenantDetail.activation.deactivate')
            ) : (
              t('tenantDetail.activation.activate')
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── InfoCard ──────────────────────────────────────────────────────────────────

interface InfoCardProps {
  tenant: TenantDetail;
}

function InfoCard({ tenant }: InfoCardProps) {
  const { t } = useTranslation('admin');

  const rows: { label: string; value: string }[] = [
    { label: t('tenantDetail.info.id'), value: tenant.id },
    { label: t('tenantDetail.info.slug'), value: tenant.slug },
    ...(tenant.superAdminEmail
      ? [
          {
            label: t('tenantDetail.info.superAdmin'),
            value: tenant.superAdminEmail,
          },
        ]
      : []),
    {
      label: t('tenantDetail.info.created'),
      value: formatDate(tenant.createdAt),
    },
    {
      label: t('tenantDetail.info.updated'),
      value: formatDate(tenant.updatedAt),
    },
  ];

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">
          {t('tenantDetail.info.title')}
        </h2>
        <dl className="flex flex-col gap-3">
          {rows.map(({ label, value }) => (
            <div
              key={label}
              className="flex flex-col gap-0.5 sm:flex-row sm:gap-4"
            >
              <dt className="w-36 shrink-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </dt>
              <dd className="break-all text-sm text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

// ── TenantDetailPage ──────────────────────────────────────────────────────────

export function TenantDetailPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const {
    data: tenant,
    isLoading,
    isError,
  } = useQuery({
    queryKey: adminTenantsKeys.detail(id ?? ''),
    queryFn: () => getTenant(id ?? ''),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/admin/tenants')}
        >
          <ArrowLeft className="me-2 size-4" aria-hidden />
          {t('tenantDetail.backToTenants')}
        </Button>
        <div className="flex flex-col items-center gap-2 p-10 text-center text-destructive">
          <AlertCircle className="size-6" aria-hidden />
          <p className="text-sm">
            {isError
              ? t('tenantDetail.error.load')
              : t('tenantDetail.notFound')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin/tenants')}
            className="-ms-2"
          >
            <ArrowLeft className="me-1.5 size-4" aria-hidden />
            {t('tenantDetail.backToTenants')}
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-semibold text-foreground">
            {tenant.name}
          </h1>
          <Badge
            variant={tenant.isActive ? 'default' : 'secondary'}
            className="ms-1"
          >
            {tenant.isActive
              ? t('tenants.status.active')
              : t('tenants.status.inactive')}
          </Badge>
        </div>
      </div>

      {/* ── Info + Activation (top row) ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        <InfoCard tenant={tenant} />
        <ActivationCard tenant={tenant} />
      </div>

      {/* ── Settings ────────────────────────────────────────────────── */}
      <SettingsCard tenant={tenant} />
    </div>
  );
}
