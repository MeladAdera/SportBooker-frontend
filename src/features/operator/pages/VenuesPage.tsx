import { useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import {
  AlertCircle,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { cn } from '@/lib/utils';
import { unwrap, ApiError } from '@/api';
import { customFetch } from '@/api/mutator';
import { useAuthStore } from '@/stores/authStore';
import { normalizeRole } from '@/lib/roles';
import { useDebounce } from '@/shared/hooks';
import {
  useVenuesControllerList,
  useVenuesControllerCreate,
  useVenuesControllerUpdate,
  useVenuesControllerActivate,
  useVenuesControllerDeactivate,
  useVenuesControllerGetById,
} from '@/api/generated/venues/venues';
import { VenuesControllerListSportType } from '@/api/generated/models/venuesControllerListSportType';
import type { VenueBrowseItemDto } from '@/api/generated/models/venueBrowseItemDto';

// ── Constants ─────────────────────────────────────────────────────────────────

const SPORT_OPTIONS = Object.values(
  VenuesControllerListSportType,
) as VenuesControllerListSportType[];
const PAGE_SIZE = 20;

// ── Schema ────────────────────────────────────────────────────────────────────

const venueSchema = z.object({
  name: z.string().min(2, 'venues.validation.nameMin'),
  address: z.string().min(3, 'venues.validation.addressMin'),
  mapsUrl: z.string().url('venues.validation.mapsUrlInvalid'),
  sportTypes: z
    .array(z.enum(SPORT_OPTIONS as [string, ...string[]]))
    .min(1, 'venues.validation.sportTypesMin'),
  pictureUrl: z
    .string()
    .url('venues.validation.pictureUrlInvalid')
    .or(z.literal(''))
    .optional(),
});

type VenueFormValues = z.infer<typeof venueSchema>;
type PictureMode = 'url' | 'file';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_BYTES = 5 * 1024 * 1024;

function validateFile(file: File): string | null {
  if (!ALLOWED_MIME.includes(file.type))
    return 'venues.validation.pictureFileType';
  if (file.size > MAX_FILE_BYTES) return 'venues.validation.pictureFileSize';
  return null;
}

// Sends multipart/form-data to PATCH /venues/:id (generated hook only does JSON)
async function patchVenueWithFile(
  id: string,
  file: File,
  fields: {
    name: string;
    address: string;
    mapsUrl: string;
    sportTypes: string[];
  },
) {
  const fd = new FormData();
  fd.append('name', fields.name);
  fd.append('address', fields.address);
  fd.append('mapsUrl', fields.mapsUrl);
  fd.append('sportTypes', JSON.stringify(fields.sportTypes));
  fd.append('picture', file);
  return customFetch(`/venues/${id}`, { method: 'PATCH', body: fd });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDefaultValues(venue: VenueBrowseItemDto | null): VenueFormValues {
  if (venue) {
    return {
      name: venue.name,
      address: venue.address,
      mapsUrl: venue.mapsUrl,
      sportTypes: venue.sportTypes as string[],
      pictureUrl: '',
    };
  }
  return { name: '', address: '', mapsUrl: '', sportTypes: [], pictureUrl: '' };
}

// ── VenueFormDialog ───────────────────────────────────────────────────────────

interface VenueFormDialogProps {
  open: boolean;
  onClose: () => void;
  editingVenue: VenueBrowseItemDto | null;
}

function VenueFormDialog({
  open,
  onClose,
  editingVenue,
}: VenueFormDialogProps) {
  const { t } = useTranslation('operator');
  const queryClient = useQueryClient();
  const isEditing = !!editingVenue;

  const [pictureMode, setPictureMode] = useState<PictureMode>('url');
  const [pickedFile, setPickedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [clearPicture, setClearPicture] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch full detail when editing so we can show the existing image
  const { data: detailData, isLoading: isDetailLoading } =
    useVenuesControllerGetById(editingVenue?.id ?? '', {
      query: { enabled: isEditing && open },
    });
  const existingPictureUrl = (() => {
    const raw = unwrap(detailData)?.pictureUrl;
    return typeof raw === 'string' ? raw : null;
  })();

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<VenueFormValues>({
    resolver: zodResolver(venueSchema),
    defaultValues: buildDefaultValues(editingVenue),
  });

  // Reset base fields immediately when dialog opens
  useEffect(() => {
    if (open) {
      reset(buildDefaultValues(editingVenue));
      setPictureMode('url');
      setPickedFile(null);
      setPreviewUrl(null);
      setFileError(null);
      setClearPicture(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingVenue?.id]);

  // Pre-fill pictureUrl once detail loads
  useEffect(() => {
    if (existingPictureUrl) {
      reset((prev) => ({ ...prev, pictureUrl: existingPictureUrl }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingPictureUrl]);

  // Revoke blob URL on unmount / file change to avoid leaks
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);

    if (!file) {
      setPickedFile(null);
      setPreviewUrl(null);
      setFileError(null);
      return;
    }

    const err = validateFile(file);
    if (err) {
      setPickedFile(null);
      setPreviewUrl(null);
      setFileError(err);
      e.target.value = '';
      return;
    }

    setPickedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setFileError(null);
  }

  function clearFile() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPickedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const invalidateAndClose = () => {
    queryClient.invalidateQueries({ queryKey: ['/venues'] });
    onClose();
  };

  const createMutation = useVenuesControllerCreate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.createSuccess'));
        invalidateAndClose();
      },
      onError: () => toast.error(t('venues.error.generic')),
    },
  });

  const updateMutation = useVenuesControllerUpdate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.updateSuccess'));
        invalidateAndClose();
      },
      onError: () => toast.error(t('venues.error.generic')),
    },
  });

  const updateWithFileMutation = useMutation({
    mutationFn: ({
      id,
      file,
      fields,
    }: {
      id: string;
      file: File;
      fields: {
        name: string;
        address: string;
        mapsUrl: string;
        sportTypes: string[];
      };
    }) => patchVenueWithFile(id, file, fields),
    onSuccess: () => {
      toast.success(t('venues.updateSuccess'));
      invalidateAndClose();
    },
    onError: () => toast.error(t('venues.error.generic')),
  });

  const isPending =
    createMutation.isPending ||
    updateMutation.isPending ||
    updateWithFileMutation.isPending;

  function onSubmit(values: VenueFormValues) {
    const baseFields = {
      name: values.name,
      address: values.address,
      mapsUrl: values.mapsUrl,
      sportTypes: values.sportTypes as VenuesControllerListSportType[],
    };

    if (isEditing) {
      if (pictureMode === 'file' && pickedFile) {
        updateWithFileMutation.mutate({
          id: editingVenue.id,
          file: pickedFile,
          fields: { ...baseFields, sportTypes: values.sportTypes },
        });
      } else {
        updateMutation.mutate({
          id: editingVenue.id,
          data: {
            ...baseFields,
            sportTypes: JSON.stringify(values.sportTypes),
            pictureUrl: clearPicture
              ? null
              : values.pictureUrl?.trim()
                ? values.pictureUrl
                : undefined,
          },
        });
      }
      return;
    }

    // Create — at least one of file or URL required
    if (pictureMode === 'file') {
      if (!pickedFile) {
        setFileError(t('venues.validation.pictureRequired'));
        return;
      }
      createMutation.mutate({
        data: {
          name: values.name,
          address: values.address,
          mapsUrl: values.mapsUrl,
          sportTypes: JSON.stringify(values.sportTypes),
          picture: pickedFile,
        },
      });
    } else {
      if (!values.pictureUrl) {
        setError('pictureUrl', {
          message: 'venues.validation.pictureRequired',
        });
        return;
      }
      createMutation.mutate({
        data: {
          name: values.name,
          address: values.address,
          mapsUrl: values.mapsUrl,
          sportTypes: JSON.stringify(values.sportTypes),
          pictureUrl: values.pictureUrl,
        },
      });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing
              ? t('venues.dialog.editTitle')
              : t('venues.dialog.createTitle')}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-name">{t('venues.fields.name')}</Label>
            <Input
              id="venue-name"
              {...register('name')}
              placeholder={t('venues.fields.namePlaceholder')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">
                {t(errors.name.message ?? '')}
              </p>
            )}
          </div>

          {/* Address */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-address">{t('venues.fields.address')}</Label>
            <Input
              id="venue-address"
              {...register('address')}
              placeholder={t('venues.fields.addressPlaceholder')}
            />
            {errors.address && (
              <p className="text-xs text-destructive">
                {t(errors.address.message ?? '')}
              </p>
            )}
          </div>

          {/* Maps URL */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="venue-maps">{t('venues.fields.mapsUrl')}</Label>
            <Input
              id="venue-maps"
              type="url"
              {...register('mapsUrl')}
              placeholder="https://maps.google.com/..."
            />
            {errors.mapsUrl && (
              <p className="text-xs text-destructive">
                {t(errors.mapsUrl.message ?? '')}
              </p>
            )}
          </div>

          {/* Sport Types */}
          <div className="flex flex-col gap-1.5">
            <Label>{t('venues.fields.sportTypes')}</Label>
            <Controller
              control={control}
              name="sportTypes"
              render={({ field }) => (
                <div className="flex flex-wrap gap-2">
                  {SPORT_OPTIONS.map((sport) => {
                    const checked = field.value.includes(sport);
                    return (
                      <button
                        key={sport}
                        type="button"
                        onClick={() => {
                          field.onChange(
                            checked
                              ? field.value.filter((s) => s !== sport)
                              : [...field.value, sport],
                          );
                        }}
                        className={cn(
                          'rounded-md border px-3 py-1.5 text-xs font-medium transition-colors',
                          checked
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-border bg-background text-foreground hover:bg-muted',
                        )}
                      >
                        {t(`matches.sport.${sport}`, { defaultValue: sport })}
                      </button>
                    );
                  })}
                </div>
              )}
            />
            {errors.sportTypes?.message && (
              <p className="text-xs text-destructive">
                {t(errors.sportTypes.message)}
              </p>
            )}
          </div>

          {/* Photo — mode toggle + input */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>
                {t('venues.fields.photo')}
                {isEditing && (
                  <span className="ms-1 text-xs text-muted-foreground">
                    ({t('venues.fields.optional')})
                  </span>
                )}
              </Label>
              <div className="flex rounded-md border border-border text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setPictureMode('url');
                    clearFile();
                  }}
                  className={cn(
                    'rounded-s-md px-2.5 py-1 transition-colors',
                    pictureMode === 'url'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t('venues.fields.modeUrl')}
                </button>
                <button
                  type="button"
                  onClick={() => setPictureMode('file')}
                  className={cn(
                    'rounded-e-md px-2.5 py-1 transition-colors',
                    pictureMode === 'file'
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t('venues.fields.modeFile')}
                </button>
              </div>
            </div>

            {/* Current image preview (edit mode, before user picks anything) */}
            {isEditing &&
              !pickedFile &&
              !clearPicture &&
              (isDetailLoading ? (
                <Skeleton className="h-36 w-full rounded-lg" />
              ) : existingPictureUrl ? (
                <div className="relative w-full overflow-hidden rounded-lg border border-border">
                  <img
                    src={existingPictureUrl}
                    alt={t('venues.fields.currentPhotoAlt')}
                    className="h-36 w-full object-cover"
                  />
                  <span className="absolute bottom-2 inset-s-2 rounded bg-background/80 px-1.5 py-0.5 text-[11px] text-muted-foreground">
                    {t('venues.fields.currentPhoto')}
                  </span>
                  <button
                    type="button"
                    onClick={() => setClearPicture(true)}
                    className="absolute inset-e-2 top-2 flex items-center gap-1 rounded bg-destructive/90 px-2 py-1 text-[11px] font-medium text-destructive-foreground hover:bg-destructive"
                  >
                    <Trash2 className="size-3" aria-hidden />
                    {t('venues.fields.removePhoto')}
                  </button>
                </div>
              ) : null)}
            {isEditing && clearPicture && (
              <div className="flex items-center justify-between rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2">
                <span className="text-xs text-muted-foreground">
                  {t('venues.fields.currentPhoto')} —{' '}
                  {t('venues.fields.removePhoto')}
                </span>
                <button
                  type="button"
                  onClick={() => setClearPicture(false)}
                  className="text-xs text-primary hover:underline"
                >
                  {t('venues.dialog.cancel')}
                </button>
              </div>
            )}

            {pictureMode === 'url' ? (
              <>
                <Input
                  id="venue-picture"
                  type="url"
                  {...register('pictureUrl')}
                  placeholder="https://..."
                />
                {errors.pictureUrl && (
                  <p className="text-xs text-destructive">
                    {t(errors.pictureUrl.message ?? '')}
                  </p>
                )}
              </>
            ) : (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ALLOWED_MIME.join(',')}
                  className="hidden"
                  onChange={handleFileChange}
                  id="venue-picture-file"
                />

                {previewUrl ? (
                  <div className="relative w-full overflow-hidden rounded-lg border border-border">
                    <img
                      src={previewUrl}
                      alt="preview"
                      className="h-36 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={clearFile}
                      className="absolute inset-e-2 top-2 rounded-full bg-background/80 p-1 shadow hover:bg-background"
                      aria-label={t('venues.fields.clearPhoto')}
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ) : (
                  <label
                    htmlFor="venue-picture-file"
                    className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 text-center text-muted-foreground transition-colors hover:bg-muted/40"
                  >
                    <div className="rounded-full bg-muted p-2">
                      <ImageIcon className="size-5" aria-hidden />
                    </div>
                    <span className="text-xs">
                      <span className="font-medium text-foreground">
                        {t('venues.fields.uploadClick')}
                      </span>{' '}
                      {t('venues.fields.uploadHint')}
                    </span>
                    <span className="text-[11px]">
                      {t('venues.fields.uploadConstraints')}
                    </span>
                  </label>
                )}

                {!previewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="me-1.5 size-3.5" aria-hidden />
                    {t('venues.fields.uploadButton')}
                  </Button>
                )}

                {fileError && (
                  <p className="text-xs text-destructive">{t(fileError)}</p>
                )}
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={onClose}
            >
              {t('venues.dialog.cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && (
                <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
              )}
              {isPending
                ? t('venues.dialog.saving')
                : isEditing
                  ? t('venues.dialog.save')
                  : t('venues.dialog.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── ConfirmDialog ─────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  body: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
  destructive?: boolean;
}

function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  isPending,
  onConfirm,
  onClose,
  destructive,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{body}</p>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={destructive ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending && (
              <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
            )}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full">
        <thead className="border-b border-border bg-muted">
          <tr>
            {Array.from({ length: 5 }).map((_, i) => (
              <th key={i} className="px-4 py-3">
                <Skeleton className="h-3 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="bg-card">
              {Array.from({ length: 5 }).map((_, j) => (
                <td key={j} className="px-4 py-3">
                  <Skeleton className="h-4 w-full max-w-[120px]" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CardsSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="flex flex-col gap-3 p-4">
            <div className="flex justify-between">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-7 w-16 rounded-lg" />
              <Skeleton className="h-7 w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ── Pagination ────────────────────────────────────────────────────────────────

interface PaginationProps {
  page: number;
  total: number;
  pageSize: number;
  onPage: (p: number) => void;
}

function Pagination({ page, total, pageSize, onPage }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-end gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
      >
        ‹
      </Button>
      <span className="text-xs text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPage(page + 1)}
      >
        ›
      </Button>
    </div>
  );
}

// ── Desktop table ─────────────────────────────────────────────────────────────

interface DesktopTableProps {
  venues: VenueBrowseItemDto[];
  canManage: boolean;
  onEdit: (v: VenueBrowseItemDto) => void;
  onToggleActive: (v: VenueBrowseItemDto) => void;
  onRowClick: (v: VenueBrowseItemDto) => void;
}

function DesktopTable({
  venues,
  canManage,
  onEdit,
  onToggleActive,
  onRowClick,
}: DesktopTableProps) {
  const { t } = useTranslation('operator');

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted">
          <tr>
            {(
              [
                'venues.table.name',
                'venues.table.address',
                'venues.table.sports',
                'venues.table.status',
                'venues.table.actions',
              ] as const
            ).map((key) => (
              <th
                key={key}
                className="px-4 py-3 text-start text-xs font-medium text-muted-foreground"
              >
                {t(key)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {venues.map((venue) => (
            <tr
              key={venue.id}
              className="cursor-pointer bg-card transition-colors hover:bg-muted/50"
              onClick={() => onRowClick(venue)}
            >
              <td className="px-4 py-3">
                <span className="font-medium text-foreground">
                  {venue.name}
                </span>
              </td>
              <td className="px-4 py-3">
                <span className="flex items-center gap-1 text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  {venue.address}
                </span>
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-1">
                  {venue.sportTypes.map((s) => (
                    <Badge key={s} variant="secondary" className="text-xs">
                      {t(`matches.sport.${s}`, { defaultValue: s })}
                    </Badge>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3">
                <Badge variant={venue.isActive ? 'default' : 'outline'}>
                  {venue.isActive
                    ? t('venues.status.active')
                    : t('venues.status.inactive')}
                </Badge>
              </td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                <div className="flex flex-wrap items-center gap-1.5">
                  <a
                    href={venue.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    {t('venues.actions.map')}
                  </a>
                  {canManage && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(venue);
                        }}
                      >
                        <Pencil className="me-1 size-3" aria-hidden />
                        {t('venues.actions.edit')}
                      </Button>
                      <Button
                        variant={venue.isActive ? 'destructive' : 'secondary'}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleActive(venue);
                        }}
                      >
                        {venue.isActive ? (
                          <>
                            <PowerOff className="me-1 size-3" aria-hidden />
                            {t('venues.actions.deactivate')}
                          </>
                        ) : (
                          <>
                            <Power className="me-1 size-3" aria-hidden />
                            {t('venues.actions.activate')}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Mobile card ───────────────────────────────────────────────────────────────

interface MobileCardProps {
  venue: VenueBrowseItemDto;
  canManage: boolean;
  onEdit: (v: VenueBrowseItemDto) => void;
  onToggleActive: (v: VenueBrowseItemDto) => void;
  onRowClick: (v: VenueBrowseItemDto) => void;
}

function MobileVenueCard({
  venue,
  canManage,
  onEdit,
  onToggleActive,
  onRowClick,
}: MobileCardProps) {
  const { t } = useTranslation('operator');

  return (
    <Card className="cursor-pointer" onClick={() => onRowClick(venue)}>
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col gap-0.5">
            <p className="font-medium text-foreground">{venue.name}</p>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3 shrink-0" aria-hidden />
              {venue.address}
            </p>
          </div>
          <Badge variant={venue.isActive ? 'default' : 'outline'}>
            {venue.isActive
              ? t('venues.status.active')
              : t('venues.status.inactive')}
          </Badge>
        </div>

        <div className="flex flex-wrap gap-1">
          {venue.sportTypes.map((s) => (
            <Badge key={s} variant="secondary" className="text-xs">
              {t(`matches.sport.${s}`, { defaultValue: s })}
            </Badge>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <a
            href={venue.mapsUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="size-3" aria-hidden />
            {t('venues.actions.map')}
          </a>
          {canManage && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(venue);
                }}
              >
                <Pencil className="me-1 size-3" aria-hidden />
                {t('venues.actions.edit')}
              </Button>
              <Button
                variant={venue.isActive ? 'destructive' : 'secondary'}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleActive(venue);
                }}
              >
                {venue.isActive ? (
                  <>
                    <PowerOff className="me-1 size-3" aria-hidden />
                    {t('venues.actions.deactivate')}
                  </>
                ) : (
                  <>
                    <Power className="me-1 size-3" aria-hidden />
                    {t('venues.actions.activate')}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── VenuesPage ────────────────────────────────────────────────────────────────

type StatusFilter = '' | 'active' | 'inactive';
type SportFilter =
  | ''
  | (typeof VenuesControllerListSportType)[keyof typeof VenuesControllerListSportType];

export function VenuesPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role ?? '');
  const normalized = normalizeRole(role);
  const canManage =
    normalized === 'super_admin' || normalized === 'tenant_admin';

  const [page, setPage] = useState(1);
  const [sportFilter, setSportFilter] = useState<SportFilter>('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [nameSearch, setNameSearch] = useState('');
  const debouncedSearch = useDebounce(nameSearch, 300);

  // form dialog
  const [formOpen, setFormOpen] = useState(false);
  const [editingVenue, setEditingVenue] = useState<VenueBrowseItemDto | null>(
    null,
  );

  // confirm dialog
  const [confirmVenue, setConfirmVenue] = useState<VenueBrowseItemDto | null>(
    null,
  );

  const { data, isLoading, isError } = useVenuesControllerList({
    page,
    limit: PAGE_SIZE,
    ...(canManage && { includeInactive: true }),
    ...(sportFilter && {
      sportType:
        sportFilter as (typeof VenuesControllerListSportType)[keyof typeof VenuesControllerListSportType],
    }),
  });

  const paginated = unwrap(data);
  const total: number = paginated?.total ?? 0;

  const venues = useMemo(() => {
    let result: VenueBrowseItemDto[] = paginated?.items ?? [];
    if (statusFilter === 'active') result = result.filter((v) => v.isActive);
    if (statusFilter === 'inactive') result = result.filter((v) => !v.isActive);
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.trim().toLowerCase();
      result = result.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.address.toLowerCase().includes(q),
      );
    }
    return result;
  }, [paginated, statusFilter, debouncedSearch]);

  const deactivateMutation = useVenuesControllerDeactivate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.deactivateSuccess'));
        queryClient.invalidateQueries({ queryKey: ['/venues'] });
        setConfirmVenue(null);
      },
      onError: (err: unknown) => {
        toast.error(
          err instanceof ApiError && err.statusCode === 409
            ? t('venues.error.deactivateConflict')
            : t('venues.error.generic'),
        );
        setConfirmVenue(null);
      },
    },
  });

  const activateMutation = useVenuesControllerActivate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.activateSuccess'));
        queryClient.invalidateQueries({ queryKey: ['/venues'] });
        setConfirmVenue(null);
      },
      onError: () => {
        toast.error(t('venues.error.generic'));
        setConfirmVenue(null);
      },
    },
  });

  const isTogglePending =
    deactivateMutation.isPending || activateMutation.isPending;

  function resetPage() {
    setPage(1);
  }

  function openCreate() {
    setEditingVenue(null);
    setFormOpen(true);
  }

  function openEdit(venue: VenueBrowseItemDto) {
    setEditingVenue(venue);
    setFormOpen(true);
  }

  function closeForm() {
    setFormOpen(false);
  }

  function handleRowClick(venue: VenueBrowseItemDto) {
    navigate(`/operator/venues/${venue.id}`);
  }

  function handleToggleActive(venue: VenueBrowseItemDto) {
    setConfirmVenue(venue);
  }

  function confirmToggle() {
    if (!confirmVenue) return;
    if (confirmVenue.isActive) {
      deactivateMutation.mutate({ id: confirmVenue.id });
    } else {
      activateMutation.mutate({ id: confirmVenue.id });
    }
  }

  const actionProps = useMemo(
    () => ({
      canManage,
      onEdit: openEdit,
      onToggleActive: handleToggleActive,
      onRowClick: handleRowClick,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [canManage],
  );

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-foreground">
          {t('venues.title')}
        </h1>
        {canManage && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="me-1.5 size-4" aria-hidden />
            {t('venues.actions.create')}
          </Button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-44 flex-1">
          <Search
            className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="ps-9"
            placeholder={t('venues.filters.search')}
            value={nameSearch}
            onChange={(e) => {
              setNameSearch(e.target.value);
              resetPage();
            }}
          />
        </div>

        <Select
          value={sportFilter}
          onValueChange={(v) => {
            setSportFilter(v as SportFilter);
            resetPage();
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t('venues.filters.sportAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('venues.filters.sportAll')}</SelectItem>
            {Object.values(VenuesControllerListSportType).map((s) => (
              <SelectItem key={s} value={s}>
                {t(`matches.sport.${s}`, { defaultValue: s })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {canManage && (
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v as StatusFilter);
              resetPage();
            }}
          >
            <SelectTrigger className="w-40">
              <SelectValue placeholder={t('venues.filters.statusAll')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">{t('venues.filters.statusAll')}</SelectItem>
              <SelectItem value="active">
                {t('venues.status.active')}
              </SelectItem>
              <SelectItem value="inactive">
                {t('venues.status.inactive')}
              </SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Error ────────────────────────────────────────────────── */}
      {isError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" aria-hidden />
          {t('venues.error.load')}
        </div>
      )}

      {/* ── Desktop table ─────────────────────────────────────────── */}
      <div className="hidden md:block">
        {isLoading ? (
          <TableSkeleton />
        ) : venues.length === 0 && !isError ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {t('venues.empty')}
          </p>
        ) : (
          <DesktopTable venues={venues} {...actionProps} />
        )}
      </div>

      {/* ── Mobile cards ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoading ? (
          <CardsSkeleton />
        ) : venues.length === 0 && !isError ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t('venues.empty')}
          </p>
        ) : (
          venues.map((v) => (
            <MobileVenueCard key={v.id} venue={v} {...actionProps} />
          ))
        )}
      </div>

      {/* ── Pagination ───────────────────────────────────────────── */}
      {!isLoading && !isError && (
        <Pagination
          page={page}
          total={total}
          pageSize={PAGE_SIZE}
          onPage={setPage}
        />
      )}

      {/* ── Form dialog ──────────────────────────────────────────── */}
      <VenueFormDialog
        open={formOpen}
        onClose={closeForm}
        editingVenue={editingVenue}
      />

      {/* ── Confirm toggle dialog ─────────────────────────────────── */}
      {confirmVenue && (
        <ConfirmDialog
          open={!!confirmVenue}
          title={
            confirmVenue.isActive
              ? t('venues.confirm.deactivateTitle')
              : t('venues.confirm.activateTitle')
          }
          body={
            confirmVenue.isActive
              ? t('venues.confirm.deactivateBody', { name: confirmVenue.name })
              : t('venues.confirm.activateBody', { name: confirmVenue.name })
          }
          confirmLabel={
            confirmVenue.isActive
              ? t('venues.confirm.deactivateConfirm')
              : t('venues.confirm.activateConfirm')
          }
          isPending={isTogglePending}
          onConfirm={confirmToggle}
          onClose={() => setConfirmVenue(null)}
          destructive={confirmVenue.isActive}
        />
      )}
    </div>
  );
}
