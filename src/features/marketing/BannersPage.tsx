import { createElement, useState } from 'react';
import { ArrowDown, ArrowUp, Image, MousePointerClick, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Dialog, EmptyState, ErrorState, IconButton, Input, PageHeader, Select, Skeleton, Switch } from '@/components/ui';
import { useBanners, useLookups } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { categoryIcon } from '@/lib/categoryIcons';
import { cn } from '@/lib/cn';
import { compactNumber, formatPercent } from '@/lib/format';
import { marketingApi } from '@/services/api';
import type { BannerInput } from '@/services/api/marketing.api';
import type { Banner } from '@/types/models';

const inv = [qk.marketing.banners];
const PLACEMENT: Record<Banner['placement'], string> = { home_hero: 'Home hero', home_strip: 'Home strip', category: 'Category page' };
const GRADIENTS = ['from-primary-500 to-primary-800', 'from-accent-400 to-accent-700', 'from-highlight-400 to-highlight-700', 'from-success-400 to-success-700', 'from-info-400 to-info-700'];

function Preview({ b, index, icon }: { b: Pick<Banner, 'title' | 'subtitle' | 'cta'>; index: number; icon?: string }) {
  return (
    <div className={cn('relative flex aspect-[2.4/1] overflow-hidden rounded-xl bg-gradient-to-br p-4 text-white', GRADIENTS[index % GRADIENTS.length])}>
      {createElement(categoryIcon(icon ?? 'sparkles'), { size: 120, strokeWidth: 1.2, className: 'absolute -bottom-6 -right-4 text-white/15', 'aria-hidden': true })}
      <div className="relative flex max-w-[70%] flex-col justify-center">
        <p className="text-md font-bold leading-tight">{b.title || 'Banner title'}</p>
        <p className="mt-1 text-xs text-white/80">{b.subtitle || 'Supporting line'}</p>
        <span className="mt-3 w-fit rounded-full bg-white px-3 py-1 text-xs font-bold text-ink">{b.cta || 'CTA'}</span>
      </div>
    </div>
  );
}

export default function BannersPage() {
  const q = useBanners();
  const cats = useLookups().data?.categories ?? [];
  const [editing, setEditing] = useState<Banner | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Banner | null>(null);
  const toggle = useApiMutation((id: string) => marketingApi.toggleBanner(id), { invalidate: inv, success: (b) => (b.active ? 'Banner published' : 'Banner unpublished') });
  const move = useApiMutation((v: { id: string; dir: -1 | 1 }) => marketingApi.moveBanner(v.id, v.dir), { invalidate: inv });
  const del = useApiMutation((id: string) => marketingApi.deleteBanner(id), { invalidate: inv, success: 'Banner deleted', onSuccess: () => setDeleting(null) });
  const iconOf = (id?: string | null) => cats.find((c) => c.id === id)?.icon;

  return (
    <>
      <PageHeader
        title="Banners"
        description="Promotional banners in the customer app. Order sets the carousel position."
        actions={
          <Button variant="panel" size="sm" icon={Plus} onClick={() => setEditing('new')}>
            New banner
          </Button>
        }
      />
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : q.isPending ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-72" />
          ))}
        </div>
      ) : !q.data.length ? (
        <Card>
          <EmptyState icon={Image} title="No banners yet" action={<Button size="sm" variant="soft" icon={Plus} onClick={() => setEditing('new')}>Create a banner</Button>} />
        </Card>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {q.data.map((b, i) => (
            <li key={b.id}>
              <Card className={cn('flex h-full flex-col gap-3', !b.active && 'opacity-70')}>
                <Preview b={b} index={i} icon={iconOf(b.categoryId)} />
                <div className="flex items-center justify-between gap-2">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <Badge tone="primary" size="xs">
                      {PLACEMENT[b.placement]}
                    </Badge>
                    {b.categoryId ? <Badge size="xs">{cats.find((c) => c.id === b.categoryId)?.name}</Badge> : null}
                  </span>
                  <Switch size="sm" label={`${b.title} published`} checked={b.active} disabled={toggle.isPending} onChange={() => toggle.mutate(b.id)} />
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <span className="rounded-lg bg-surface-2 py-2">
                    <span className="block text-sm font-bold tabular text-ink">{compactNumber(b.impressions)}</span>
                    <span className="text-2xs text-ink-3">Views</span>
                  </span>
                  <span className="rounded-lg bg-surface-2 py-2">
                    <span className="block text-sm font-bold tabular text-ink">{compactNumber(b.clicks)}</span>
                    <span className="text-2xs text-ink-3">Taps</span>
                  </span>
                  <span className="rounded-lg bg-surface-2 py-2">
                    <span className="flex items-center justify-center gap-1 text-sm font-bold tabular text-ink">
                      <MousePointerClick size={12} />
                      {b.impressions ? formatPercent(b.clicks / b.impressions, 1) : '—'}
                    </span>
                    <span className="text-2xs text-ink-3">CTR</span>
                  </span>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3">
                  <span className="flex items-center gap-1">
                    <IconButton icon={ArrowUp} label="Move earlier" size="sm" disabled={i === 0 || move.isPending} onClick={() => move.mutate({ id: b.id, dir: -1 })} />
                    <IconButton icon={ArrowDown} label="Move later" size="sm" disabled={i === q.data.length - 1 || move.isPending} onClick={() => move.mutate({ id: b.id, dir: 1 })} />
                    <span className="ml-1 text-xs text-ink-3">Position {i + 1}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <IconButton icon={Pencil} label="Edit banner" size="sm" onClick={() => setEditing(b)} />
                    <IconButton icon={Trash2} label="Delete banner" size="sm" variant="danger" onClick={() => setDeleting(b)} />
                  </span>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
      {editing ? <BannerDialog banner={editing === 'new' ? undefined : editing} index={editing === 'new' ? (q.data?.length ?? 0) : (q.data?.findIndex((x) => x.id === editing.id) ?? 0)} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog open={!!deleting} onClose={() => setDeleting(null)} onConfirm={() => deleting && del.mutate(deleting.id)} loading={del.isPending} tone="danger" icon={Trash2} title="Delete banner?" confirmLabel="Delete" message={`“${deleting?.title}” will be removed from the app.`} />
    </>
  );
}

function BannerDialog({ banner, index, onClose }: { banner?: Banner; index: number; onClose: () => void }) {
  const cats = (useLookups().data?.categories ?? []).filter((c) => !c.parentId);
  const [v, setV] = useState<BannerInput>(banner ? { title: banner.title, subtitle: banner.subtitle, cta: banner.cta, categoryId: banner.categoryId ?? null, placement: banner.placement, active: banner.active, sortOrder: banner.sortOrder, image: banner.image } : { title: '', subtitle: '', cta: 'Book now', categoryId: null, placement: 'home_hero', active: false, sortOrder: index + 1 });
  const errors = { title: v.title.trim().length < 3 ? 'At least 3 characters' : v.title.length > 40 ? 'Keep it under 40 characters' : undefined, subtitle: v.subtitle.length > 60 ? 'Keep it under 60 characters' : undefined, cta: !v.cta.trim() ? 'Required' : v.cta.length > 16 ? 'Max 16 characters' : undefined };
  const [touched, setTouched] = useState(false);
  const m = useApiMutation(() => marketingApi.saveBanner(v, banner?.id), { invalidate: inv, success: banner ? 'Banner saved' : 'Banner created', onSuccess: onClose });
  const ok = !Object.values(errors).some(Boolean);
  const cat = cats.find((c) => c.id === v.categoryId);
  return (
    <Dialog
      open
      onClose={onClose}
      size="lg"
      title={banner ? 'Edit banner' : 'New banner'}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" loading={m.isPending} onClick={() => (setTouched(true), ok && m.mutate())}>
            {banner ? 'Save changes' : 'Create banner'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 md:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Input label="Title" required value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} error={touched ? errors.title : undefined} />
          <Input label="Subtitle" value={v.subtitle} onChange={(e) => setV({ ...v, subtitle: e.target.value })} error={errors.subtitle} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Button text" value={v.cta} onChange={(e) => setV({ ...v, cta: e.target.value })} error={errors.cta} />
            <Select label="Placement" value={v.placement} onChange={(e) => setV({ ...v, placement: e.target.value as Banner['placement'] })} options={Object.entries(PLACEMENT).map(([value, label]) => ({ value, label }))} />
          </div>
          <Select label="Opens category" value={v.categoryId ?? ''} onChange={(e) => setV({ ...v, categoryId: e.target.value || null })} options={[{ value: '', label: 'Offers page' }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
          <label className="flex items-center justify-between rounded-xl border border-line px-3 py-2.5 text-sm font-medium text-ink">
            Publish now
            <Switch label="Publish now" checked={v.active} onChange={(a) => setV({ ...v, active: a })} />
          </label>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-ink-2">Preview</p>
          <Preview b={v} index={index} icon={cat?.icon} />
          <p className="mt-2 text-xs text-ink-3">Upload a 1200 × 500 image from your CMS once the media API is connected; the illustration is used until then.</p>
        </div>
      </div>
    </Dialog>
  );
}
