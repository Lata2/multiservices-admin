import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Star, Wrench } from 'lucide-react';
import { CategorySelect } from '@/components/domain';
import { ClearFilters, TablePager } from '@/components/domain/ListKit';
import { Badge, Button, DataTable, Drawer, EmptyState, ErrorState, IconButton, Input, PageHeader, SearchInput, Select, Switch, Textarea, Toolbar } from '@/components/ui';
import { useLookups, useServices } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { formatMoney, formatNumber } from '@/lib/format';
import { catalogApi } from '@/services/api';
import type { ServiceFilters } from '@/services/api/catalog.api';
import type { Service } from '@/types/models';

type F = { categoryId?: string; providerId?: string; active?: string };
const inv = [qk.catalog.all, qk.providers.all];

export default function ServicesPage() {
  const t = useTableState<F>({ sort: 'bookings', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = useServices(params as unknown as ServiceFilters);
  const lookups = useLookups().data;
  const can = useCan();
  const manage = can('catalog.manage');
  const [editing, setEditing] = useState<Service | null>(null);
  const toggle = useApiMutation((id: string) => catalogApi.toggleService(id), { invalidate: inv, success: (s) => `${s.title} ${s.active ? 'is live' : 'hidden'}` });
  const catName = (id?: string) => lookups?.categories.find((c) => c.id === id)?.name ?? '';

  return (
    <>
      <PageHeader title="Services" description="Every service listed by providers. Edit pricing or take listings offline." />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search service or provider…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CategorySelect value={params.categoryId ?? ''} onChange={(e) => t.setFilter('categoryId', e.target.value)} containerClassName="sm:w-44" />
          <Select aria-label="Provider" compact placeholder="All providers" value={params.providerId ?? ''} onChange={(e) => t.setFilter('providerId', e.target.value)} options={(lookups?.providers ?? []).map((p) => ({ value: p.id, label: p.name }))} containerClassName="sm:w-48" />
          <Select aria-label="Visibility" compact placeholder="Live & hidden" value={params.active ?? ''} onChange={(e) => t.setFilter('active', e.target.value)} options={[{ value: 'active', label: 'Live' }, { value: 'inactive', label: 'Hidden' }]} containerClassName="sm:w-36" />
        </div>
        <ClearFilters show={!!(params.categoryId || params.providerId || params.active || params.search)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Services"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(s) => s.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={manage ? setEditing : undefined}
          empty={<EmptyState icon={Wrench} title="No services found" />}
          columns={[
            {
              key: 'title',
              header: 'Service',
              sortKey: 'title',
              mobile: 'title',
              cell: (s) => (
                <span className="block min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="max-w-72 truncate font-semibold text-ink">{s.title}</span>
                    {s.tags.map((tg) => (
                      <Badge key={tg} tone="accent" size="xs">
                        {tg}
                      </Badge>
                    ))}
                  </span>
                  <span className="block truncate text-xs text-ink-3">{s.providerName}</span>
                </span>
              ),
            },
            { key: 'cat', header: 'Category', hideBelow: 'lg', cell: (s) => <span className="whitespace-nowrap">{catName(s.subcategoryId) || catName(s.categoryId)}</span> },
            {
              key: 'price',
              header: 'Price',
              sortKey: 'price',
              align: 'right',
              cell: (s) => (
                <span className="whitespace-nowrap tabular">
                  <span className="font-semibold text-ink">{formatMoney(s.discountPrice ?? s.price)}</span>
                  {s.discountPrice ? <span className="ml-1 text-xs text-ink-3 line-through">{formatMoney(s.price)}</span> : null}
                </span>
              ),
            },
            { key: 'duration', header: 'Duration', hideBelow: 'xl', align: 'right', cell: (s) => (s.durationMin >= 1440 ? `${Math.round(s.durationMin / 1440)} days` : s.durationMin >= 60 ? `${s.durationMin / 60} h` : `${s.durationMin} min`) },
            { key: 'bookings', header: 'Bookings', sortKey: 'bookings', align: 'right', cell: (s) => <span className="tabular">{formatNumber(s.bookings)}</span> },
            { key: 'rating', header: 'Rating', sortKey: 'rating', align: 'right', hideBelow: 'lg', cell: (s) => (s.rating ? <span className="inline-flex items-center gap-1 tabular"><Star size={12} className="fill-warning-400 text-warning-400" />{s.rating.toFixed(1)}</span> : '—') },
            {
              key: 'active',
              header: 'Live',
              align: 'center',
              mobile: 'aside',
              cell: (s) => (
                <span onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1">
                  <Switch size="sm" label={`${s.title} live`} checked={s.active} disabled={!manage || toggle.isPending} onChange={() => toggle.mutate(s.id)} />
                </span>
              ),
            },
            { key: 'edit', header: <span className="sr-only">Edit</span>, mobile: false, align: 'right', cell: (s) => (manage ? <IconButton icon={Pencil} label={`Edit ${s.title}`} size="sm" onClick={(e) => (e.stopPropagation(), setEditing(s))} /> : null) },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
      {editing ? <ServiceDrawer service={editing} onClose={() => setEditing(null)} /> : null}
    </>
  );
}

const schema = z
  .object({
    title: z.string().trim().min(4, 'At least 4 characters').max(80),
    description: z.string().trim().min(20, 'Write at least 20 characters'),
    price: z.number({ message: 'Enter a price' }).positive('Must be above 0'),
    discountPrice: z.number().nonnegative().optional(),
    durationMin: z.number({ message: 'Enter minutes' }).int().min(10, 'At least 10 minutes'),
    includes: z.string(),
    excludes: z.string(),
    requiresPickup: z.boolean(),
    active: z.boolean(),
  })
  .refine((v) => !v.discountPrice || v.discountPrice < v.price, { path: ['discountPrice'], message: 'Must be lower than the list price' });
type Values = z.infer<typeof schema>;

function ServiceDrawer({ service: s, onClose }: { service: Service; onClose: () => void }) {
  const { register, handleSubmit, formState, watch, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: s.title, description: s.description, price: s.price, discountPrice: s.discountPrice ?? 0, durationMin: s.durationMin, includes: s.includes.join('\n'), excludes: s.excludes.join('\n'), requiresPickup: s.requiresPickup, active: s.active },
  });
  const save = useApiMutation(
    (v: Values) =>
      catalogApi.saveService(s.id, {
        title: v.title,
        description: v.description,
        price: v.price,
        discountPrice: v.discountPrice || undefined,
        durationMin: v.durationMin,
        includes: v.includes.split('\n').map((x) => x.trim()).filter(Boolean),
        excludes: v.excludes.split('\n').map((x) => x.trim()).filter(Boolean),
        requiresPickup: v.requiresPickup,
        active: v.active,
      }),
    { invalidate: inv, success: 'Service saved', onSuccess: onClose },
  );
  const submit = handleSubmit((v) => save.mutate(v));
  return (
    <Drawer
      open
      onClose={onClose}
      width="lg"
      title="Edit service"
      description={`Listed by ${s.providerName}. Changes apply to new bookings.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={save.isPending} onClick={submit}>
            Save changes
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Title" required error={formState.errors.title?.message} {...register('title')} containerClassName="sm:col-span-2" />
        <Textarea label="Description" rows={3} required error={formState.errors.description?.message} {...register('description')} containerClassName="sm:col-span-2" />
        <Input label="List price" prefixText="₹" type="number" error={formState.errors.price?.message} {...register('price', { valueAsNumber: true })} />
        <Input label="Offer price" prefixText="₹" type="number" hint="0 = no offer" error={formState.errors.discountPrice?.message} {...register('discountPrice', { valueAsNumber: true })} />
        <Input label="Duration" suffix="min" type="number" error={formState.errors.durationMin?.message} {...register('durationMin', { valueAsNumber: true })} />
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2 text-sm font-medium text-ink">
            Needs pickup & drop
            <Switch size="sm" label="Needs pickup and drop" checked={watch('requiresPickup')} onChange={(v) => setValue('requiresPickup', v)} />
          </label>
        </div>
        <Textarea label="What’s included" rows={4} hint="One item per line" {...register('includes')} />
        <Textarea label="Not included" rows={4} hint="One item per line" {...register('excludes')} />
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink sm:col-span-2">
          Live for customers
          <Switch label="Live for customers" checked={watch('active')} onChange={(v) => setValue('active', v)} />
        </label>
      </form>
    </Drawer>
  );
}
