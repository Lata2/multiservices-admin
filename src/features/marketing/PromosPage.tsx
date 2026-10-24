import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BadgePercent, Copy, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, Input, Menu, PageHeader, ProgressBar, SearchInput, Segmented, Select, Switch, Textarea, Toolbar } from '@/components/ui';
import { useLookups, usePromos } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { formatDate, formatMoney, formatNumber, toDateKey } from '@/lib/format';
import { marketingApi } from '@/services/api';
import { isApiError } from '@/services/http';
import { toast } from '@/store/toast.store';
import type { PromoCode } from '@/types/models';

const inv = [qk.marketing.promos];
const expired = (p: PromoCode) => new Date(p.expiresAt).getTime() < Date.now();
const scheduled = (p: PromoCode) => new Date(p.startsAt).getTime() > Date.now();

export default function PromosPage() {
  const q = usePromos();
  const lookups = useLookups().data;
  const [tab, setTab] = useState<'all' | 'live' | 'scheduled' | 'ended'>('all');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<PromoCode | 'new' | null>(null);
  const [deleting, setDeleting] = useState<PromoCode | null>(null);
  const toggle = useApiMutation((id: string) => marketingApi.togglePromo(id), { invalidate: inv, success: (p) => `${p.code} ${p.active ? 'activated' : 'paused'}` });
  const del = useApiMutation((id: string) => marketingApi.deletePromo(id), { invalidate: inv, success: 'Promo deleted', onSuccess: () => setDeleting(null) });

  const rows = useMemo(
    () =>
      (q.data ?? []).filter(
        (p) =>
          (tab === 'all' || (tab === 'live' ? p.active && !expired(p) && !scheduled(p) : tab === 'scheduled' ? scheduled(p) && !expired(p) : expired(p) || !p.active)) &&
          (!search || `${p.code} ${p.title}`.toLowerCase().includes(search.toLowerCase())),
      ),
    [q.data, tab, search],
  );
  const provName = (id: string | null) => (id ? lookups?.providers.find((p) => p.id === id)?.name ?? 'Provider' : null);

  return (
    <>
      <PageHeader
        title="Promo codes"
        description="Discount codes customers apply at checkout. Provider codes are funded by the provider."
        actions={
          <Button variant="panel" size="sm" icon={Plus} onClick={() => setEditing('new')}>
            New promo
          </Button>
        }
      />
      <Toolbar>
        <Segmented label="Status" value={tab} onChange={setTab} options={[{ value: 'all', label: 'All' }, { value: 'live', label: 'Live' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'ended', label: 'Paused / ended' }]} />
        <SearchInput value={search} onChange={setSearch} placeholder="Search code or title…" className="sm:w-60" />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Promo codes"
          data={rows}
          loading={q.isPending}
          rowKey={(p) => p.id}
          onRowClick={(p) => setEditing(p)}
          empty={<EmptyState icon={BadgePercent} title="No promo codes here" action={<Button size="sm" variant="soft" icon={Plus} onClick={() => setEditing('new')}>Create one</Button>} />}
          columns={[
            {
              key: 'code',
              header: 'Code',
              mobile: 'title',
              sortValue: (p) => p.code,
              cell: (p) => (
                <span className="block min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-panel/50 bg-panel-soft px-2 py-0.5 text-sm font-bold tracking-wide text-panel-ink">{p.code}</span>
                  <span className="mt-1 block max-w-64 truncate text-xs text-ink-3">{p.title}</span>
                </span>
              ),
            },
            { key: 'discount', header: 'Discount', sortValue: (p) => p.value, cell: (p) => <span className="whitespace-nowrap font-semibold text-ink">{p.discountType === 'percent' ? `${p.value}%` : formatMoney(p.value)}{p.maxDiscount ? <span className="block text-xs font-normal text-ink-3">up to {formatMoney(p.maxDiscount)}</span> : null}</span> },
            { key: 'min', header: 'Min. order', hideBelow: 'xl', cell: (p) => (p.minOrder ? formatMoney(p.minOrder) : 'None') },
            { key: 'scope', header: 'Funded by', hideBelow: 'lg', cell: (p) => (p.providerId ? <Badge tone="info" size="xs">{provName(p.providerId)}</Badge> : <Badge tone="primary" size="xs">Platform</Badge>) },
            {
              key: 'usage',
              header: 'Usage',
              sortValue: (p) => p.usageCount / p.usageLimit,
              cell: (p) => (
                <span className="block w-28">
                  <span className="text-xs tabular text-ink-2">
                    {formatNumber(p.usageCount)} / {formatNumber(p.usageLimit)}
                  </span>
                  <ProgressBar value={p.usageCount / p.usageLimit} tone={p.usageCount >= p.usageLimit ? 'danger' : 'primary'} className="mt-1" label="Usage" />
                </span>
              ),
            },
            { key: 'valid', header: 'Valid', hideBelow: 'md', sortValue: (p) => p.expiresAt, cell: (p) => <span className="whitespace-nowrap text-sm">{expired(p) ? <Badge tone="neutral" size="xs">Expired {formatDate(p.expiresAt)}</Badge> : scheduled(p) ? <Badge tone="info" size="xs">Starts {formatDate(p.startsAt)}</Badge> : `Until ${formatDate(p.expiresAt)}`}</span> },
            { key: 'active', header: 'Active', align: 'center', mobile: 'aside', cell: (p) => <span onClick={(e) => e.stopPropagation()}><Switch size="sm" label={`${p.code} active`} checked={p.active} disabled={toggle.isPending} onChange={() => toggle.mutate(p.id)} /></span> },
            {
              key: 'menu',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              mobile: false,
              cell: (p) => (
                <Menu
                  items={[
                    { label: 'Edit', icon: Pencil, onSelect: () => setEditing(p) },
                    { label: 'Copy code', icon: Copy, onSelect: () => void navigator.clipboard?.writeText(p.code).then(() => toast.success(`Copied ${p.code}`)) },
                    { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => setDeleting(p), disabled: p.usageCount > 0 },
                  ]}
                />
              ),
            },
          ]}
        />
      )}
      {editing ? <PromoDialog promo={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} tone="danger" icon={Trash2} title={`Delete ${deleting?.code}?`} confirmLabel="Delete" message="This can’t be undone." />
    </>
  );
}

const schema = z
  .object({
    code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{4,16}$/, '4–16 letters or numbers, no spaces'),
    title: z.string().trim().min(5, 'At least 5 characters').max(60),
    description: z.string().trim().max(160),
    discountType: z.enum(['percent', 'flat']),
    value: z.number({ message: 'Enter a value' }).positive('Must be above 0'),
    maxDiscount: z.number().nonnegative().optional(),
    minOrder: z.number({ message: 'Enter 0 for none' }).nonnegative(),
    providerId: z.string(),
    startsAt: z.string().min(1, 'Pick a date'),
    expiresAt: z.string().min(1, 'Pick a date'),
    usageLimit: z.number({ message: 'Required' }).int().min(1),
    perUserLimit: z.number({ message: 'Required' }).int().min(1).max(10),
    active: z.boolean(),
  })
  .refine((v) => v.discountType === 'flat' || v.value <= 90, { path: ['value'], message: 'Max 90%' })
  .refine((v) => v.expiresAt > v.startsAt, { path: ['expiresAt'], message: 'Must be after the start date' })
  .refine((v) => v.discountType === 'percent' || v.minOrder === 0 || v.value < v.minOrder, { path: ['value'], message: 'Flat discount must be below the minimum order' });
type Values = z.infer<typeof schema>;

function PromoDialog({ promo, onClose }: { promo?: PromoCode; onClose: () => void }) {
  const providers = (useLookups().data?.providers ?? []).filter((p) => p.status === 'approved');
  const day = (iso: string) => toDateKey(new Date(iso));
  const { register, handleSubmit, formState, watch, setValue, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: promo
      ? { ...promo, description: promo.description, providerId: promo.providerId ?? '', startsAt: day(promo.startsAt), expiresAt: day(promo.expiresAt), maxDiscount: promo.maxDiscount ?? 0 }
      : { code: '', title: '', description: '', discountType: 'percent', value: 10, maxDiscount: 200, minOrder: 499, providerId: '', startsAt: toDateKey(new Date()), expiresAt: toDateKey(new Date(Date.now() + 30 * 86_400_000)), usageLimit: 1000, perUserLimit: 1, active: true },
  });
  const save = useApiMutation(
    (v: Values) =>
      marketingApi.savePromo(
        { ...v, providerId: v.providerId || null, maxDiscount: v.discountType === 'percent' && v.maxDiscount ? v.maxDiscount : undefined, startsAt: new Date(`${v.startsAt}T00:00:00`).toISOString(), expiresAt: new Date(`${v.expiresAt}T23:59:59`).toISOString() },
        promo?.id,
      ),
    {
      invalidate: inv,
      success: promo ? 'Promo saved' : 'Promo created',
      onSuccess: onClose,
      toastError: false,
      onError: (e) => (isApiError(e) && e.fieldErrors?.code ? setError('code', { message: e.fieldErrors.code }) : toast.error(isApiError(e) ? e.message : 'Could not save')),
    },
  );
  const submit = handleSubmit((v) => save.mutate(v));
  const err = formState.errors;
  const pct = watch('discountType') === 'percent';
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={promo ? `Edit ${promo.code}` : 'New promo code'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={save.isPending} onClick={submit}>
            {promo ? 'Save changes' : 'Create promo'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} noValidate className="grid gap-4 sm:grid-cols-2">
        <Input label="Code" required error={err.code?.message} {...register('code')} className="font-bold uppercase tracking-wide" />
        <Select label="Funded by" value={watch('providerId')} onChange={(e) => setValue('providerId', e.target.value)} options={[{ value: '', label: 'Platform (Servio)' }, ...providers.map((p) => ({ value: p.id, label: p.name }))]} />
        <Input label="Title" required error={err.title?.message} {...register('title')} containerClassName="sm:col-span-2" hint="Shown on the offers screen" />
        <Textarea label="Terms" rows={2} error={err.description?.message} {...register('description')} containerClassName="sm:col-span-2" />
        <div className="sm:col-span-2">
          <Segmented label="Discount type" value={watch('discountType')} onChange={(v) => setValue('discountType', v)} options={[{ value: 'percent', label: 'Percentage' }, { value: 'flat', label: 'Flat amount' }]} />
        </div>
        <Input label={pct ? 'Discount %' : 'Discount amount'} type="number" prefixText={pct ? undefined : '₹'} suffix={pct ? '%' : undefined} error={err.value?.message} {...register('value', { valueAsNumber: true })} />
        {pct ? <Input label="Max discount" prefixText="₹" type="number" hint="0 = no cap" error={err.maxDiscount?.message} {...register('maxDiscount', { valueAsNumber: true })} /> : <div className="max-sm:hidden" />}
        <Input label="Minimum order" prefixText="₹" type="number" error={err.minOrder?.message} {...register('minOrder', { valueAsNumber: true })} />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Total uses" type="number" error={err.usageLimit?.message} {...register('usageLimit', { valueAsNumber: true })} />
          <Input label="Per customer" type="number" error={err.perUserLimit?.message} {...register('perUserLimit', { valueAsNumber: true })} />
        </div>
        <Input label="Starts" type="date" error={err.startsAt?.message} {...register('startsAt')} />
        <Input label="Ends" type="date" error={err.expiresAt?.message} {...register('expiresAt')} />
        <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink sm:col-span-2">
          Active
          <Switch label="Active" checked={watch('active')} onChange={(v) => setValue('active', v)} />
        </label>
      </form>
    </Dialog>
  );
}
