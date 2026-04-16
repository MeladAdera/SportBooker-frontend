import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  ExternalLink,
  ImageIcon,
  Loader2,
  MapPin,
  Power,
  PowerOff,
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
import { Skeleton } from '@/components/ui/skeleton';
import { unwrap, ApiError } from '@/api';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import {
  useVenuesControllerGetById,
  useVenuesControllerActivate,
  useVenuesControllerDeactivate,
  getVenuesControllerGetByIdQueryKey,
} from '@/api/generated/venues/venues';

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractPictureUrl(raw: unknown): string | null {
  if (typeof raw === 'string') return raw;
  return null;
}

// ── VenueDetailPage ───────────────────────────────────────────────────────────

export function VenueDetailPage() {
  const { t } = useTranslation('operator');
  const navigate = useNavigate();
  const { id = '' } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const role = useAuthStore((s) => s.user?.role ?? '');
  const canManage =
    normalizeRole(role) === 'super_admin' ||
    normalizeRole(role) === 'tenant_admin';

  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: raw, isLoading, isError } = useVenuesControllerGetById(id);
  const venue = unwrap(raw);

  const pictureUrl = extractPictureUrl(venue?.pictureUrl);

  function invalidate() {
    queryClient.invalidateQueries({
      queryKey: getVenuesControllerGetByIdQueryKey(id),
    });
    queryClient.invalidateQueries({ queryKey: ['/venues'] });
  }

  const deactivateMutation = useVenuesControllerDeactivate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.deactivateSuccess'));
        invalidate();
        setConfirmOpen(false);
      },
      onError: (err: unknown) => {
        const msg =
          err instanceof ApiError && err.statusCode === 409
            ? err.message || t('venueDetail.deactivateConflict')
            : t('venues.error.generic');
        toast.error(msg);
        setConfirmOpen(false);
      },
    },
  });

  const activateMutation = useVenuesControllerActivate({
    mutation: {
      onSuccess: () => {
        toast.success(t('venues.activateSuccess'));
        invalidate();
        setConfirmOpen(false);
      },
      onError: () => {
        toast.error(t('venues.error.generic'));
        setConfirmOpen(false);
      },
    },
  });

  const isTogglePending =
    deactivateMutation.isPending || activateMutation.isPending;

  function handleToggle() {
    if (!venue) return;
    if (venue.isActive) {
      deactivateMutation.mutate({ id });
    } else {
      activateMutation.mutate({ id });
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 w-fit"
          onClick={() => navigate('/operator/venues')}
        >
          <ArrowLeft className="me-1.5 size-4" aria-hidden />
          {t('venueDetail.back')}
        </Button>
        <Skeleton className="h-56 w-full rounded-xl" />
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Error / Not found ──────────────────────────────────────────────────────

  if (isError || !venue) {
    return (
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="-ms-2 w-fit"
          onClick={() => navigate('/operator/venues')}
        >
          <ArrowLeft className="me-1.5 size-4" aria-hidden />
          {t('venueDetail.back')}
        </Button>
        <div className="flex flex-col items-center gap-2 py-16 text-center text-destructive">
          <AlertCircle className="size-6" aria-hidden />
          <p className="text-sm">
            {isError ? t('venueDetail.error') : t('venueDetail.notFound')}
          </p>
        </div>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* Back */}
      <Button
        variant="ghost"
        size="sm"
        className="-ms-2 w-fit"
        onClick={() => navigate('/operator/venues')}
      >
        <ArrowLeft className="me-1.5 size-4" aria-hidden />
        {t('venueDetail.back')}
      </Button>

      {/* Hero image */}
      {pictureUrl ? (
        <div className="overflow-hidden rounded-xl border border-border">
          <img
            src={pictureUrl}
            alt={venue.name}
            className="h-56 w-full object-cover md:h-72"
          />
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-border bg-muted md:h-56">
          <ImageIcon className="size-10 text-muted-foreground/40" aria-hidden />
        </div>
      )}

      {/* Info card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-col gap-3">
              {/* Name + status */}
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">
                  {venue.name}
                </h1>
                <Badge variant={venue.isActive ? 'default' : 'outline'}>
                  {venue.isActive
                    ? t('venues.status.active')
                    : t('venues.status.inactive')}
                </Badge>
              </div>

              {/* Address */}
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-4 shrink-0" aria-hidden />
                {venue.address}
              </p>

              {/* Maps link */}
              <a
                href={venue.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                <ExternalLink className="size-3.5" aria-hidden />
                {t('venueDetail.openInMaps')}
              </a>

              {/* Sport types */}
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('venueDetail.sports')}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {venue.sportTypes.map((s) => (
                    <Badge key={s} variant="secondary">
                      {t(`matches.sport.${s}`, { defaultValue: s })}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            {canManage && (
              <Button
                variant={venue.isActive ? 'destructive' : 'secondary'}
                size="sm"
                onClick={() => setConfirmOpen(true)}
              >
                {venue.isActive ? (
                  <>
                    <PowerOff className="me-1.5 size-4" aria-hidden />
                    {t('venues.actions.deactivate')}
                  </>
                ) : (
                  <>
                    <Power className="me-1.5 size-4" aria-hidden />
                    {t('venues.actions.activate')}
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirm toggle dialog */}
      <Dialog
        open={confirmOpen}
        onOpenChange={(o) => !o && setConfirmOpen(false)}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {venue.isActive
                ? t('venues.confirm.deactivateTitle')
                : t('venues.confirm.activateTitle')}
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {venue.isActive
              ? t('venues.confirm.deactivateBody', { name: venue.name })
              : t('venues.confirm.activateBody', { name: venue.name })}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={isTogglePending}
              onClick={() => setConfirmOpen(false)}
            >
              {t('venues.dialog.cancel')}
            </Button>
            <Button
              variant={venue.isActive ? 'destructive' : 'default'}
              disabled={isTogglePending}
              onClick={handleToggle}
            >
              {isTogglePending && (
                <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
              )}
              {venue.isActive
                ? t('venues.confirm.deactivateConfirm')
                : t('venues.confirm.activateConfirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
