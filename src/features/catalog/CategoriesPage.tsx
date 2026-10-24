import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronRight, LayoutGrid, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ErrorState, IconButton, Input, Menu, PageHeader, Select, Skeleton, Switch, Textarea } from '@/components/ui';
import { useCategoryTree } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan } from '@/hooks/useAccess';
import { CATEGORY_ICONS, categoryIcon, tintFor } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import { formatMoneyCompact, formatNumber, titleCase } from '@/lib/format';
import { catalogApi } from '@/services/api';
import type { CategoryInput, CategoryNode } from '@/services/api/catalog.api';
import type { Category } from '@/types/models';

const inv = [qk.catalog.all, qk.lookups];

export default function CategoriesPage() {
  const q = useCategoryTree();
  const can = useCan();
  const manage = can('catalog.manage');
  const [expanded, setExpanded] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ cat?: Category; parentId?: string | null } | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const toggle = useApiMutation((c: Category) => catalogApi.saveCategory({ ...pick(c), active: !c.active }, c.id), { invalidate: inv, success: (r) => `${r.name} ${r.active ? 'activated' : 'hidden'}` });
  const del = useApiMutation((id: string) => catalogApi.deleteCategory(id), { invalidate: inv, success: 'Category deleted', onSuccess: () => setDeleting(null) });

  return (
    <>
      <PageHeader
        title="Categories"
        description="The service catalogue shown in the apps. Commission is set per category."
        actions={
          manage ? (
            <Button variant="panel" size="sm" icon={Plus} onClick={() => setEditing({ parentId: null })}>
              New category
            </Button>
          ) : null
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-18" />
          ))}
        </div>
      ) : !q.data.length ? (
        <EmptyState icon={LayoutGrid} title="No categories yet" />
      ) : (
        <Card padded={false}>
          <div className="hidden grid-cols-[minmax(0,1fr)_90px_90px_100px_100px_70px_44px] gap-3 border-b border-line bg-surface-2/70 px-4 py-2.5 text-xs font-semibold text-ink-3 lg:grid">
            <span>Category</span>
            <span className="text-right">Services</span>
            <span className="text-right">Bookings</span>
            <span className="text-right">GMV</span>
            <span className="text-right">Commission</span>
            <span className="text-center">Live</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {q.data.map((c, i) => {
              const open = expanded.includes(c.id);
              const I = categoryIcon(c.icon);
              return (
                <li key={c.id}>
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1fr)_90px_90px_100px_100px_70px_44px]">
                    <button type="button" onClick={() => setExpanded(open ? expanded.filter((x) => x !== c.id) : [...expanded, c.id])} aria-expanded={open} className="focus-ring flex min-w-0 items-center gap-3 rounded-lg text-left">
                      <ChevronRight size={16} className={cn('shrink-0 text-ink-3 transition-transform', open && 'rotate-90')} />
                      <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', tintFor(i))}>
                        <I size={19} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold text-ink">{c.name}</span>
                          {c.featured ? <Badge tone="accent" size="xs">Featured</Badge> : null}
                        </span>
                        <span className="block truncate text-xs text-ink-3">
                          {c.children.length} sub-categories
                          <span className="lg:hidden">, {c.serviceCount} services, {c.commissionRate}% commission</span>
                        </span>
                      </span>
                    </button>
                    <span className="hidden text-right tabular lg:block">{c.serviceCount}</span>
                    <span className="hidden text-right tabular lg:block">{formatNumber(c.bookings)}</span>
                    <span className="hidden text-right font-semibold tabular text-ink lg:block">{formatMoneyCompact(c.gmv)}</span>
                    <span className="hidden text-right tabular lg:block">{c.commissionRate}%</span>
                    <span className="hidden justify-center lg:flex">
                      <Switch size="sm" label={`${c.name} live`} checked={c.active} disabled={!manage || toggle.isPending} onChange={() => toggle.mutate(c)} />
                    </span>
                    {manage ? (
                      <Menu
                        items={[
                          { label: 'Edit', icon: Pencil, onSelect: () => setEditing({ cat: c }) },
                          { label: 'Add sub-category', icon: Plus, onSelect: () => setEditing({ parentId: c.id }) },
                          { label: c.active ? 'Hide from apps' : 'Show in apps', icon: LayoutGrid, onSelect: () => toggle.mutate(c) },
                          { label: 'Delete', icon: Trash2, tone: 'danger', onSelect: () => setDeleting(c) },
                        ]}
                      />
                    ) : (
                      <span />
                    )}
                  </div>
                  {open ? (
                    <ul className="animate-fade-in border-t border-dashed border-line bg-surface-2/50 py-1">
                      {c.children.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 py-2 pl-[76px] pr-4">
                          <span className="min-w-0 flex-1">
                            <span className={cn('text-sm font-medium', s.active ? 'text-ink' : 'text-ink-3 line-through')}>{s.name}</span>
                            <span className="ml-2 text-xs text-ink-3">{s.serviceCount} services</span>
                          </span>
                          <Switch size="sm" label={`${s.name} live`} checked={s.active} disabled={!manage || toggle.isPending} onChange={() => toggle.mutate(s)} />
                          {manage ? (
                            <>
                              <IconButton icon={Pencil} label={`Edit ${s.name}`} size="xs" onClick={() => setEditing({ cat: s })} />
                              <IconButton icon={Trash2} label={`Delete ${s.name}`} size="xs" variant="danger" onClick={() => setDeleting(s)} />
                            </>
                          ) : null}
                        </li>
                      ))}
                      {manage ? (
                        <li className="py-1.5 pl-[76px]">
                          <Button size="xs" variant="ghost" icon={Plus} onClick={() => setEditing({ parentId: c.id })}>
                            Add sub-category
                          </Button>
                        </li>
                      ) : null}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </Card>
      )}
      {editing ? <CategoryDialog tree={q.data ?? []} cat={editing.cat} parentId={editing.parentId} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={() => deleting && del.mutate(deleting.id)}
        loading={del.isPending}
        tone="danger"
        icon={Trash2}
        title={`Delete ${deleting?.name}?`}
        confirmLabel="Delete"
        message="Only empty categories can be deleted. If it has services, hide it instead."
      />
    </>
  );
}

const pick = (c: Category): CategoryInput => ({ name: c.name, icon: c.icon, parentId: c.parentId, description: c.description, active: c.active, featured: c.featured, commissionRate: c.commissionRate, sortOrder: c.sortOrder });

const schema = z.object({
  name: z.string().trim().min(2, 'At least 2 characters').max(40, 'Keep it under 40 characters'),
  icon: z.string().min(1),
  parentId: z.string().nullable(),
  description: z.string().max(140, 'Keep it under 140 characters').optional(),
  commissionRate: z.number({ message: 'Enter a number' }).min(0, 'Min 0%').max(50, 'Max 50%'),
  sortOrder: z.number().int().min(1),
  active: z.boolean(),
  featured: z.boolean(),
});
type Values = z.infer<typeof schema>;

function CategoryDialog({ tree, cat, parentId, onClose }: { tree: CategoryNode[]; cat?: Category; parentId?: string | null; onClose: () => void }) {
  const parent = tree.find((t) => t.id === (cat?.parentId ?? parentId));
  const { register, handleSubmit, formState, watch, setValue, setError } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: cat
      ? { ...pick(cat), description: cat.description ?? '' }
      : { name: '', icon: parent?.icon ?? 'sparkles', parentId: parentId ?? null, description: '', commissionRate: parent?.commissionRate ?? 15, sortOrder: (parent ? parent.children.length : tree.length) + 1, active: true, featured: false },
  });
  const save = useApiMutation((v: Values) => catalogApi.saveCategory(v, cat?.id), {
    invalidate: inv,
    success: cat ? 'Category saved' : 'Category created',
    onSuccess: onClose,
    onError: (e) => {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe?.name) setError('name', { message: fe.name });
    },
  });
  const isSub = !!watch('parentId');
  const IconPreview = categoryIcon(watch('icon'));
  return (
    <Dialog
      open
      onClose={onClose}
      title={cat ? `Edit ${cat.name}` : isSub ? `New sub-category in ${parent?.name}` : 'New category'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={save.isPending} onClick={handleSubmit((v) => save.mutate(v))}>
            {cat ? 'Save changes' : 'Create'}
          </Button>
        </>
      }
    >
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit((v) => save.mutate(v))} noValidate>
        <Input label="Name" required error={formState.errors.name?.message} {...register('name')} containerClassName="sm:col-span-2" />
        {!isSub ? (
          <>
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-sm font-semibold text-ink-2">Icon</p>
              <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Icon">
                {Object.entries(CATEGORY_ICONS).map(([key, I]) => (
                  <button key={key} type="button" role="radio" aria-checked={watch('icon') === key} aria-label={titleCase(key)} onClick={() => setValue('icon', key)} className={cn('focus-ring flex h-9 w-9 items-center justify-center rounded-lg border transition-colors', watch('icon') === key ? 'border-panel bg-panel-soft text-panel-ink' : 'border-line text-ink-2 hover:border-line-strong')}>
                    <I size={17} />
                  </button>
                ))}
              </div>
            </div>
            <Textarea label="Short description" rows={2} error={formState.errors.description?.message} {...register('description')} containerClassName="sm:col-span-2" hint="Shown under the category name in the customer app" />
          </>
        ) : (
          <Select label="Parent category" value={watch('parentId') ?? ''} onChange={(e) => setValue('parentId', e.target.value)} options={tree.map((t) => ({ value: t.id, label: t.name }))} containerClassName="sm:col-span-2" />
        )}
        <Input label="Commission" suffix="%" type="number" readOnly={isSub} hint={isSub ? 'Inherited from the parent' : 'Platform share of the service subtotal'} error={formState.errors.commissionRate?.message} {...register('commissionRate', { valueAsNumber: true })} />
        <Input label="Display order" type="number" min={1} error={formState.errors.sortOrder?.message} {...register('sortOrder', { valueAsNumber: true })} />
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm font-medium text-ink">
            <IconPreview size={16} /> Live in apps
          </span>
          <Switch label="Live in apps" checked={watch('active')} onChange={(v) => setValue('active', v)} />
        </div>
        {!isSub ? (
          <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5">
            <span className="text-sm font-medium text-ink">Featured on home</span>
            <Switch label="Featured on home" checked={watch('featured')} onChange={(v) => setValue('featured', v)} />
          </div>
        ) : null}
      </form>
    </Dialog>
  );
}
