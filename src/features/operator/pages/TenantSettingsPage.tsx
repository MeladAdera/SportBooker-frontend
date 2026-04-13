import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { ExternalLink, Loader2, Settings } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { useTenantSettingsControllerUpdateSettings } from '@/api/generated/tenant-settings/tenant-settings';
import { ApiError } from '@/api';

const settingsSchema = z.object({
  ziinaAccessToken: z.string().min(10, 'settings.ziina.tokenPlaceholder'),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export function TenantSettingsPage() {
  const { t } = useTranslation('operator');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
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

  function onSubmit(values: SettingsFormValues) {
    mutation.mutate({
      data: { ziinaAccessToken: values.ziinaAccessToken } as Parameters<
        typeof mutation.mutate
      >[0]['data'],
    });
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div className="flex items-center gap-2">
        <Settings className="size-5 text-muted-foreground" aria-hidden />
        <h1 className="text-xl font-semibold text-foreground">
          {t('settings.title')}
        </h1>
      </div>

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

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="ziina-token"
                className="text-sm font-medium text-foreground"
              >
                {t('settings.ziina.tokenLabel')}
              </label>
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
    </div>
  );
}
