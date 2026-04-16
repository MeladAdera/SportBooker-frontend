import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ApiError, unwrap } from '@/api';
import { formatCurrency, formatDateInTz, formatTimeInTz } from '@/lib/format';
import { normalizeRole } from '@/lib/roles';
import { useAuthStore } from '@/stores/authStore';
import { useTenantTimezone } from '@/shared/hooks';
import {
  useMatchesControllerCancelMatch,
  useMatchesControllerGetById,
  getMatchesControllerGetByIdQueryKey,
} from '@/api/generated/matches/matches';
import { getTenantMatchesControllerListQueryKey } from '@/api/generated/tenant-—-matches/tenant-—-matches';
import { MatchDetailResponseDtoStatus } from '@/api/generated/models/matchDetailResponseDtoStatus';

export function CancelMatchPage() {
  const { t } = useTranslation('operator');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const tenantTz = useTenantTimezone();

  const role = useAuthStore((s) => s.user?.role ?? '');
  const normalized = normalizeRole(role);
  const canCancel =
    normalized === 'super_admin' || normalized === 'tenant_admin';

  const {
    data: matchRes,
    isLoading,
    isError,
  } = useMatchesControllerGetById(id ?? '', { query: { enabled: !!id } });

  const match = unwrap(matchRes);
  const isCancelled = match?.status === MatchDetailResponseDtoStatus.cancelled;

  const cancelMutation = useMatchesControllerCancelMatch({
    mutation: {
      onSuccess: (res) => {
        const dto = unwrap(res);
        if (dto) {
          toast.success(
            t('cancelMatch.successToast', {
              count: dto.cancelledBookings,
              amount: formatCurrency(Number(dto.refundedAmount)),
            }),
          );
        } else {
          toast.success(t('cancelMatch.successGeneric'));
        }
        void queryClient.invalidateQueries({
          queryKey: getMatchesControllerGetByIdQueryKey(id ?? ''),
        });
        void queryClient.invalidateQueries({
          queryKey: getTenantMatchesControllerListQueryKey(),
        });
        navigate(`/operator/matches/${id}`);
      },
      onError: (err: unknown) => {
        if (err instanceof ApiError) {
          if (err.statusCode === 403) {
            toast.error(t('cancelMatch.error.forbidden'));
          } else if (err.statusCode === 404) {
            toast.error(t('cancelMatch.error.notFound'));
          } else {
            toast.error(t('cancelMatch.error.generic'));
          }
        } else {
          toast.error(t('cancelMatch.error.generic'));
        }
      },
    },
  });

  if (!id) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('cancelMatch.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/operator/matches')}>
          {t('cancelMatch.backMatches')}
        </Button>
      </div>
    );
  }

  if (isError || (!isLoading && !match)) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center text-muted-foreground">
        <p>{t('cancelMatch.error.notFound')}</p>
        <Button variant="outline" onClick={() => navigate('/operator/matches')}>
          {t('cancelMatch.backMatches')}
        </Button>
      </div>
    );
  }

  if (!canCancel) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 text-muted-foreground"
          onClick={() => navigate(`/operator/matches/${id}`)}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('cancelMatch.backDetail')}
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('cancelMatch.forbidden')}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !match) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8 text-muted-foreground">
        <Loader2 className="size-8 animate-spin" aria-hidden />
      </div>
    );
  }

  if (isCancelled) {
    return (
      <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-6">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit gap-1.5 text-muted-foreground"
          onClick={() => navigate(`/operator/matches/${id}`)}
        >
          <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
          {t('cancelMatch.backDetail')}
        </Button>
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t('cancelMatch.alreadyCancelled')}
          </CardContent>
        </Card>
      </div>
    );
  }

  const confirmed = match.maxCapacity - match.spotsRemaining;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-6 p-4 md:p-6">
      <Button
        variant="ghost"
        size="sm"
        className="w-fit gap-1.5 text-muted-foreground"
        onClick={() => navigate(`/operator/matches/${id}`)}
      >
        <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden />
        {t('cancelMatch.backDetail')}
      </Button>

      <div>
        <h1 className="text-xl font-semibold text-foreground">
          {t('cancelMatch.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('cancelMatch.subtitle')}
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-6 text-sm">
          <p className="font-medium text-foreground">{match.title}</p>
          <p className="text-muted-foreground">
            {formatDateInTz(match.scheduledAt, tenantTz)} ·{' '}
            {formatTimeInTz(match.scheduledAt, tenantTz)}
          </p>
          <p className="text-muted-foreground">
            {t('cancelMatch.confirmedCount', { count: confirmed })}
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="p-6 text-sm text-muted-foreground">
          {t('cancelMatch.warning')}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button
          variant="outline"
          onClick={() => navigate(`/operator/matches/${id}`)}
          disabled={cancelMutation.isPending}
        >
          {t('cancelMatch.keepMatch')}
        </Button>
        <Button
          variant="destructive"
          disabled={cancelMutation.isPending}
          onClick={() => cancelMutation.mutate({ id })}
        >
          {cancelMutation.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {t('cancelMatch.submitting')}
            </>
          ) : (
            t('cancelMatch.confirm')
          )}
        </Button>
      </div>
    </div>
  );
}
