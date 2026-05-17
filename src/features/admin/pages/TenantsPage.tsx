import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
} from '@tanstack/react-table';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Building2, Loader2, Plus, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { ApiError } from '@/api';
import { useDebounce } from '@/shared/hooks';
import {
  adminTenantsKeys,
  createTenant,
  listTenants,
  type CreateTenantDto,
  type TenantListItem,
} from '../api';

// ── Constants ─────────────────────────────────────────────────────────────────

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ActiveFilter = '' | 'active' | 'inactive';

// ── Create form schema ────────────────────────────────────────────────────────

const createSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .max(63)
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, digits and hyphens only'),
  adminName: z.string().min(1),
  adminEmail: z.string().email(),
  adminPassword: z.string().min(8),
});

type CreateFormValues = z.infer<typeof createSchema>;

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

// ── CreateTenantDialog ────────────────────────────────────────────────────────

interface CreateTenantDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Maps backend field paths (e.g. "superAdmin.email") to form field names. */
const BACKEND_FIELD_MAP: Record<string, keyof CreateFormValues> = {
  name: 'name',
  slug: 'slug',
  'superAdmin.name': 'adminName',
  'superAdmin.email': 'adminEmail',
  'superAdmin.password': 'adminPassword',
};

function CreateTenantDialog({ open, onOpenChange }: CreateTenantDialogProps) {
  const { t } = useTranslation('admin');
  console.log('CreateTenantDialog', open);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
  });

  const mutation = useMutation({
    mutationFn: (dto: CreateTenantDto) => createTenant(dto),
    onSuccess: () => {
      toast.success(t('tenants.create.success'));
      queryClient.invalidateQueries({ queryKey: adminTenantsKeys.all });
      reset();
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.statusCode === 409) {
          setError('slug', { message: t('tenants.create.error.slugTaken') });
          return;
        }
        if (err.statusCode === 422 && Array.isArray(err.errors)) {
          let hasUnmapped = false;
          for (const e of err.errors as Array<{
            field: string;
            messages?: string[];
            message?: string;
          }>) {
            const formField = BACKEND_FIELD_MAP[e.field];
            const msg =
              (Array.isArray(e.messages) ? e.messages[0] : e.message) ??
              e.field;
            if (formField) {
              setError(formField, { message: msg });
            } else {
              hasUnmapped = true;
            }
          }
          if (hasUnmapped) {
            toast.error(t('tenants.create.error.generic'));
          }
          return;
        }
      }
      toast.error(t('tenants.create.error.generic'));
    },
  });

  function onSubmit(values: CreateFormValues) {
    mutation.mutate({
      name: values.name,
      slug: values.slug,
      superAdmin: {
        name: values.adminName,
        email: values.adminEmail,
        password: values.adminPassword,
      },
    });
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('tenants.create.title')}</DialogTitle>
          <DialogDescription>
            {t('tenants.create.description')}
          </DialogDescription>
        </DialogHeader>

        <form
          id="create-tenant-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-4 py-2"
        >
          {/* Tenant Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-name">{t('tenants.create.fields.name')}</Label>
            <Input
              id="ct-name"
              placeholder={t('tenants.create.fields.namePlaceholder')}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Slug */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-slug">{t('tenants.create.fields.slug')}</Label>
            <Input
              id="ct-slug"
              placeholder={t('tenants.create.fields.slugPlaceholder')}
              {...register('slug')}
            />
            <p className="text-xs text-muted-foreground">
              {t('tenants.create.fields.slugHint')}
            </p>
            {errors.slug && (
              <p className="text-xs text-destructive">{errors.slug.message}</p>
            )}
          </div>

          {/* Admin Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-admin-name">
              {t('tenants.create.fields.adminName')}
            </Label>
            <Input
              id="ct-admin-name"
              placeholder={t('tenants.create.fields.adminNamePlaceholder')}
              {...register('adminName')}
            />
            {errors.adminName && (
              <p className="text-xs text-destructive">
                {errors.adminName.message}
              </p>
            )}
          </div>

          {/* Admin Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-admin-email">
              {t('tenants.create.fields.adminEmail')}
            </Label>
            <Input
              id="ct-admin-email"
              type="email"
              placeholder={t('tenants.create.fields.adminEmailPlaceholder')}
              {...register('adminEmail')}
            />
            {errors.adminEmail && (
              <p className="text-xs text-destructive">
                {errors.adminEmail.message}
              </p>
            )}
          </div>

          {/* Admin Password */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ct-admin-password">
              {t('tenants.create.fields.adminPassword')}
            </Label>
            <Input
              id="ct-admin-password"
              type="password"
              autoComplete="new-password"
              placeholder={t('tenants.create.fields.adminPasswordPlaceholder')}
              {...register('adminPassword')}
            />
            {errors.adminPassword && (
              <p className="text-xs text-destructive">
                {errors.adminPassword.message}
              </p>
            )}
          </div>
        </form>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={mutation.isPending}
          >
            {t('tenants.create.cancel')}
          </Button>
          <Button
            type="submit"
            form="create-tenant-form"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="me-2 size-4 animate-spin" aria-hidden />
                {t('tenants.create.submitting')}
              </>
            ) : (
              t('tenants.create.submit')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Column helper ─────────────────────────────────────────────────────────────

const col = createColumnHelper<TenantListItem>();

// ── TenantsPage ───────────────────────────────────────────────────────────────

export function TenantsPage() {
  const { t } = useTranslation('admin');
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(20);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 400);
  const [createOpen, setCreateOpen] = useState(false);

  const params = useMemo(
    () => ({
      page,
      limit,
      ...(debouncedSearch.trim() ? { search: debouncedSearch.trim() } : {}),
      ...(activeFilter !== '' ? { isActive: activeFilter === 'active' } : {}),
    }),
    [page, limit, debouncedSearch, activeFilter],
  );

  const { data, isLoading, isError } = useQuery({
    queryKey: adminTenantsKeys.list(params),
    queryFn: () => listTenants(params),
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  const columns = useMemo(
    () => [
      col.accessor('name', {
        header: t('tenants.table.name'),
        cell: (info) => (
          <span className="font-medium text-foreground">{info.getValue()}</span>
        ),
      }),
      col.accessor('slug', {
        header: t('tenants.table.slug'),
        cell: (info) => (
          <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {info.getValue()}
          </code>
        ),
      }),
      col.accessor('isActive', {
        header: t('tenants.table.status'),
        cell: (info) => (
          <Badge variant={info.getValue() ? 'default' : 'secondary'}>
            {info.getValue()
              ? t('tenants.status.active')
              : t('tenants.status.inactive')}
          </Badge>
        ),
      }),
      col.accessor('createdAt', {
        header: t('tenants.table.created'),
        cell: (info) => (
          <span className="text-sm text-muted-foreground">
            {formatDate(info.getValue())}
          </span>
        ),
      }),
      col.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/admin/tenants/${info.row.original.id}`)}
          >
            {t('tenants.actions.view')}
          </Button>
        ),
      }),
    ],
    [t, navigate],
  );

  /* eslint-disable react-hooks/incompatible-library */
  const table = useReactTable({
    data: items,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });
  /* eslint-enable react-hooks/incompatible-library */

  function resetPage() {
    setPage(1);
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-muted-foreground" aria-hidden />
          <h1 className="text-xl font-semibold text-foreground">
            {t('tenants.title')}
          </h1>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="me-1.5 size-4" aria-hidden />
          {t('tenants.createButton')}
        </Button>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-48 flex-1">
          <Search
            className="absolute inset-s-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            className="ps-9"
            placeholder={t('tenants.filters.search')}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              resetPage();
            }}
          />
        </div>

        <Select
          value={activeFilter}
          onValueChange={(v) => {
            setActiveFilter(v as ActiveFilter);
            resetPage();
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder={t('tenants.filters.statusAll')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">{t('tenants.filters.statusAll')}</SelectItem>
            <SelectItem value="active">
              {t('tenants.filters.statusActive')}
            </SelectItem>
            <SelectItem value="inactive">
              {t('tenants.filters.statusInactive')}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── Table ───────────────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          {isError ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center text-destructive">
              <AlertCircle className="size-6" aria-hidden />
              <p className="text-sm">{t('tenants.error.load')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr
                      key={hg.id}
                      className="border-b border-border bg-muted/40"
                    >
                      {hg.headers.map((h) => (
                        <th
                          key={h.id}
                          className="px-4 py-3 text-start text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-border">
                        {columns.map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : table.getRowModel().rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="px-4 py-10 text-center text-muted-foreground"
                      >
                        {t('tenants.empty')}
                      </td>
                    </tr>
                  ) : (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="cursor-pointer border-b border-border transition-colors last:border-0 hover:bg-muted/30"
                        onClick={() =>
                          navigate(`/admin/tenants/${row.original.id}`)
                        }
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            className="px-4 py-3"
                            onClick={
                              cell.column.id === 'actions'
                                ? (e) => e.stopPropagation()
                                : undefined
                            }
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Pagination ──────────────────────────────────────────────── */}
      {!isError && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
          <span className="tabular-nums">
            {isLoading
              ? t('tenants.pagination.loading')
              : t('tenants.pagination.range', {
                  from: rangeStart,
                  to: rangeEnd,
                  total,
                })}
          </span>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="shrink-0">
                {t('tenants.pagination.perPage')}
              </span>
              <Select
                value={String(limit)}
                onValueChange={(v) => {
                  setLimit(Number(v) as (typeof PAGE_SIZE_OPTIONS)[number]);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-18 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((p) => p - 1)}
              >
                {t('tenants.pagination.prev')}
              </Button>
              <span className="tabular-nums">
                {t('tenants.pagination.page', { page, total: totalPages })}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((p) => p + 1)}
              >
                {t('tenants.pagination.next')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create dialog ────────────────────────────────────────────── */}
      <CreateTenantDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
}
