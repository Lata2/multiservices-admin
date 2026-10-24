import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { BadgeCheck, Ban, CheckCircle2, ChevronDown, FileText, Mail, MapPin, Phone, RotateCcw, Sparkles, Star, XCircle } from 'lucide-react';
import { Avatar, Badge, Button, Callout, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, ErrorState, Input, KeyValue, Menu, MiniStat, PageHeader, PageLoader, StatusBadge, Switch, Tabs, Textarea } from '@/components/ui';
import { useLookups, useProvider } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan, usePanel } from '@/hooks/useAccess';
import { formatDate, formatDay, formatMoney, formatMoneyCompact, formatPercent, timeAgo } from '@/lib/format';
import { BOOKING_STATUS, DOC_STATUS, PAYOUT_STATUS, PROVIDER_STATUS } from '@/lib/status';
import { catalogApi, providersApi } from '@/services/api';
import type { ProviderDetail } from '@/services/api/providers.api';
import type { ProviderStatus } from '@/types/models';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ProviderDetailPage() {
  const { id = '' } = useParams();
  const q = useProvider(id);
  const { to } = usePanel();
  if (q.isPending) return <PageLoader />;
  if (q.isError)
    return (
      <>
        <PageHeader title="Provider" back={to('/providers')} />
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      </>
    );
  return <Detail d={q.data} />;
}

function Detail({ d }: { d: ProviderDetail }) {
  const p = d.provider;
  const can = useCan();
  const manage = can('providers.manage');
  const { to } = usePanel();
  const navigate = useNavigate();
  const cats = useLookups().data?.categories ?? [];
  const [tab, setTab] = useState<'overview' | 'services' | 'bookings' | 'payouts' | 'reviews'>('overview');
  const [action, setAction] = useState<ProviderStatus | null>(null);
  const [note, setNote] = useState('');
  const [commission, setCommission] = useState(String(p.commissionRate));
  const [visiting, setVisiting] = useState(String(p.visitingCharge));
  const inv = [qk.providers.all, qk.dashboard.admin, qk.lookups, qk.catalog.all];

  const setStatus = useApiMutation((s: ProviderStatus) => providersApi.setStatus(p.id, s, note), {
    invalidate: inv,
    success: (_, s) => `${p.businessName} ${PROVIDER_STATUS[s].label.toLowerCase()}`,
    onSuccess: () => (setAction(null), setNote('')),
  });
  const saveCommission = useApiMutation(() => providersApi.setCommission(p.id, Number(commission)), { invalidate: inv, success: 'Commission updated' });
  const saveVisiting = useApiMutation(() => providersApi.setVisitingCharge(p.id, Number(visiting)), { invalidate: inv, success: 'Visiting charge updated' });
  const verifyDoc = useApiMutation((v: { docId: string; status: 'verified' | 'rejected'; note?: string }) => providersApi.verifyDocument(p.id, v.docId, v.status, v.note), { invalidate: inv, success: (_, v) => `Document ${v.status}` });
  const featured = useApiMutation(() => providersApi.toggleFeatured(p.id), { invalidate: inv, success: p.featured ? 'Removed from featured' : 'Featured on home screen' });
  const toggleSvc = useApiMutation((id: string) => catalogApi.toggleService(id), { invalidate: inv, success: 'Service updated' });

  const docsReady = p.documents.every((x) => x.status === 'verified' || x.status === 'pending');
  const actionCopy: Partial<Record<ProviderStatus, { title: string; label: string; tone: 'danger' | 'primary'; msg: string; needNote: boolean }>> = {
    approved: { title: 'Approve provider?', label: 'Approve', tone: 'primary', msg: 'All documents will be marked verified and services go live for customers.', needNote: false },
    rejected: { title: 'Reject application?', label: 'Reject', tone: 'danger', msg: 'The provider is told why and can re-apply with new documents.', needNote: true },
    suspended: { title: 'Suspend provider?', label: 'Suspend', tone: 'danger', msg: 'Services are hidden and no new bookings can be placed. Existing bookings are unaffected.', needNote: true },
  };
  const ac = action ? actionCopy[action === 'pending' ? 'approved' : action] : null;

  return (
    <>
      <PageHeader
        back={to('/providers')}
        breadcrumbs={[{ label: 'Providers', to: to('/providers') }, { label: p.businessName }]}
        title={p.businessName}
        meta={
          <span className="flex items-center gap-1.5">
            <StatusBadge map={PROVIDER_STATUS} value={p.status} />
            {p.featured ? <Badge tone="accent">Featured</Badge> : null}
          </span>
        }
        actions={
          manage ? (
            p.status === 'pending' ? (
              <>
                <Button variant="outline" size="sm" icon={XCircle} onClick={() => setAction('rejected')}>
                  Reject
                </Button>
                <Button variant="success" size="sm" icon={CheckCircle2} onClick={() => setAction('approved')}>
                  Approve
                </Button>
              </>
            ) : (
              <Menu
                trigger={(t) => (
                  <Button variant="panel" size="sm" iconRight={ChevronDown} {...t}>
                    Manage
                  </Button>
                )}
                items={[
                  { label: p.featured ? 'Remove from featured' : 'Feature on home', icon: Sparkles, onSelect: () => featured.mutate(), hidden: p.status !== 'approved' },
                  { label: 'Reinstate', icon: RotateCcw, onSelect: () => setAction('approved'), hidden: p.status === 'approved' },
                  { label: 'Suspend', icon: Ban, tone: 'danger', onSelect: () => setAction('suspended'), hidden: p.status !== 'approved' },
                ]}
              />
            )
          ) : null
        }
      />

      {p.statusNote && p.status !== 'approved' ? (
        <Callout tone={p.status === 'pending' ? 'warning' : 'danger'} title={p.status === 'suspended' ? 'Suspension reason' : 'Review note'} className="mb-4">
          {p.statusNote}
        </Callout>
      ) : p.status === 'pending' ? (
        <Callout tone="warning" icon={FileText} title="Application waiting for review" className="mb-4">
          Check the KYC documents below, then approve or reject. Applied {timeAgo(p.joinedAt)}.
        </Callout>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex items-center gap-3">
              <Avatar name={p.businessName} src={p.avatar} size="lg" square />
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-md font-bold text-ink">
                  {p.businessName} {p.verified ? <BadgeCheck size={16} className="shrink-0 text-primary-500" /> : null}
                </p>
                <p className="text-sm text-ink-3">
                  {p.ownerName}, {p.yearsExperience} yrs experience
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-ink-2">{p.about}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.categoryIds.map((id) => (
                <Badge key={id} tone="primary" size="xs">
                  {cats.find((c) => c.id === id)?.name ?? id}
                </Badge>
              ))}
            </div>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ink-2">
              <li className="flex items-center gap-2.5">
                <Phone size={15} className="text-ink-3" />
                {p.phone}
              </li>
              <li className="flex items-center gap-2.5">
                <Mail size={15} className="text-ink-3" />
                <span className="truncate">{p.email}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-3" />
                {p.address}
              </li>
            </ul>
          </Card>
          <Card>
            <CardHeader title="Working hours" />
            <ul className="grid grid-cols-1 gap-1 text-sm">
              {p.hours.map((h) => (
                <li key={h.day} className="flex justify-between">
                  <span className="text-ink-3">{DAYS[h.day]}</span>
                  <span className="font-medium text-ink">{h.open ? `${h.start} – ${h.end}` : 'Closed'}</span>
                </li>
              ))}
            </ul>
          </Card>
          {p.bank ? (
            <Card>
              <CardHeader title="Payout account" />
              <dl className="divide-y divide-line">
                <KeyValue label="Bank" value={p.bank.bankName} />
                <KeyValue label="Account" value={p.bank.accountNumber} />
                <KeyValue label="IFSC" value={p.bank.ifsc} />
                <KeyValue label="Wallet balance" value={formatMoney(p.walletBalance)} />
              </dl>
            </Card>
          ) : null}
        </div>

        <div className="min-w-0">
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat label="Lifetime GMV" value={formatMoneyCompact(d.stats.gmv)} />
            <MiniStat label="Commission earned" value={formatMoneyCompact(d.stats.commission)} tone="success" />
            <MiniStat label="Completion rate" value={formatPercent(d.stats.completionRate)} />
            <MiniStat label="Rating" value={p.rating ? `${p.rating.toFixed(1)} ★ (${p.reviewCount})` : 'New'} />
          </div>
          <Tabs
            label="Provider sections"
            className="mb-4"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: 'overview', label: 'KYC & terms' },
              { value: 'services', label: 'Services', count: d.services.length },
              { value: 'bookings', label: 'Bookings', count: d.stats.bookings },
              { value: 'payouts', label: 'Payouts', count: d.payouts.length },
              { value: 'reviews', label: 'Reviews', count: p.reviewCount },
            ]}
          />

          {tab === 'overview' ? (
            <div className="flex flex-col gap-4">
              <Card>
                <CardHeader title="KYC documents" subtitle={docsReady ? 'Ready for review' : 'Some documents are missing or rejected'} />
                <ul className="divide-y divide-line">
                  {p.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
                      <span className="flex min-w-0 flex-1 items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-3 text-ink-2">
                          <FileText size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{doc.name}</span>
                          <span className="text-xs text-ink-3">{doc.uploadedAt ? `Uploaded ${formatDate(doc.uploadedAt)}` : 'Not uploaded'}{doc.note ? ` — ${doc.note}` : ''}</span>
                        </span>
                      </span>
                      <span className="flex items-center gap-2 pl-12 sm:pl-0">
                        <StatusBadge map={DOC_STATUS} value={doc.status} size="xs" />
                        {manage && doc.status !== 'missing' ? (
                          <>
                            {doc.status !== 'verified' ? (
                              <Button size="xs" variant="soft" loading={verifyDoc.isPending && verifyDoc.variables?.docId === doc.id && verifyDoc.variables.status === 'verified'} onClick={() => verifyDoc.mutate({ docId: doc.id, status: 'verified' })}>
                                Verify
                              </Button>
                            ) : null}
                            {doc.status !== 'rejected' ? (
                              <Button size="xs" variant="ghost" onClick={() => verifyDoc.mutate({ docId: doc.id, status: 'rejected', note: 'Unclear or invalid document — please re-upload' })}>
                                Reject
                              </Button>
                            ) : null}
                          </>
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
              <Card>
                <CardHeader title="Commercial terms" subtitle="Applies to new bookings only" />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-end gap-2">
                    <Input label="Commission" suffix="%" inputMode="numeric" value={commission} disabled={!manage} onChange={(e) => setCommission(e.target.value.replace(/\D/g, '').slice(0, 2))} containerClassName="flex-1" hint="Platform share of service subtotal (0–50%)" />
                    {manage ? (
                      <Button variant="outline" className="mb-5" disabled={commission === String(p.commissionRate) || !commission} loading={saveCommission.isPending} onClick={() => saveCommission.mutate()}>
                        Save
                      </Button>
                    ) : null}
                  </div>
                  <div className="flex items-end gap-2">
                    <Input label="Visiting charge" prefixText="₹" inputMode="numeric" value={visiting} disabled={!manage} onChange={(e) => setVisiting(e.target.value.replace(/\D/g, '').slice(0, 4))} containerClassName="flex-1" hint="Added to each booking" />
                    {manage ? (
                      <Button variant="outline" className="mb-5" disabled={visiting === String(p.visitingCharge) || !visiting} loading={saveVisiting.isPending} onClick={() => saveVisiting.mutate()}>
                        Save
                      </Button>
                    ) : null}
                  </div>
                </div>
              </Card>
            </div>
          ) : tab === 'services' ? (
            <DataTable
              caption="Provider services"
              data={d.services}
              rowKey={(s) => s.id}
              empty={<EmptyState compact title="No services listed" />}
              columns={[
                { key: 'title', header: 'Service', mobile: 'title', sortValue: (s) => s.title, cell: (s) => <span className="block max-w-72 truncate font-medium text-ink">{s.title}</span> },
                { key: 'price', header: 'Price', align: 'right', sortValue: (s) => s.discountPrice ?? s.price, cell: (s) => <span className="tabular">{formatMoney(s.discountPrice ?? s.price)}{s.discountPrice ? <span className="ml-1 text-xs text-ink-3 line-through">{formatMoney(s.price)}</span> : null}</span> },
                { key: 'bookings', header: 'Bookings', align: 'right', sortValue: (s) => s.bookings, cell: (s) => <span className="tabular">{s.bookings}</span> },
                { key: 'rating', header: 'Rating', align: 'right', hideBelow: 'lg', cell: (s) => (s.rating ? `${s.rating.toFixed(1)} ★` : '—') },
                { key: 'active', header: 'Live', mobile: 'aside', align: 'right', cell: (s) => <span onClick={(e) => e.stopPropagation()}><Switch size="sm" label={`${s.title} live`} checked={s.active} disabled={!can('catalog.manage') || toggleSvc.isPending} onChange={() => toggleSvc.mutate(s.id)} /></span> },
              ]}
            />
          ) : tab === 'bookings' ? (
            <DataTable
              caption="Recent bookings"
              data={d.recentBookings}
              rowKey={(b) => b.id}
              onRowClick={(b) => navigate(to(`/bookings/${b.id}`))}
              empty={<EmptyState compact title="No bookings yet" />}
              columns={[
                { key: 'code', header: 'Booking', mobile: 'title', cell: (b) => <span><span className="font-semibold text-ink">#{b.code}</span><span className="block max-w-56 truncate text-xs text-ink-3">{b.customerName}</span></span> },
                { key: 'date', header: 'Scheduled', cell: (b) => formatDay(b.scheduledDate) },
                { key: 'status', header: 'Status', mobile: 'aside', cell: (b) => <StatusBadge map={BOOKING_STATUS} value={b.status} size="xs" /> },
                { key: 'total', header: 'Total', align: 'right', cell: (b) => <span className="font-semibold tabular">{formatMoney(b.pricing.total)}</span> },
              ]}
            />
          ) : tab === 'payouts' ? (
            <DataTable
              caption="Payouts"
              data={d.payouts}
              rowKey={(x) => x.id}
              empty={<EmptyState compact title="No payouts yet" />}
              columns={[
                { key: 'date', header: 'Requested', mobile: 'title', cell: (x) => formatDate(x.requestedAt) },
                { key: 'utr', header: 'Reference', hideBelow: 'lg', cell: (x) => x.utr ?? '—' },
                { key: 'amount', header: 'Amount', align: 'right', cell: (x) => <span className="font-semibold tabular">{formatMoney(x.amount)}</span> },
                { key: 'status', header: 'Status', mobile: 'aside', cell: (x) => <StatusBadge map={PAYOUT_STATUS} value={x.status} size="xs" /> },
              ]}
            />
          ) : (
            <Card padded={false}>
              {d.reviews.length ? (
                <ul className="divide-y divide-line">
                  {d.reviews.map((r) => (
                    <li key={r.id} className="px-4 py-3.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">{r.customerName}</span>
                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning-600">
                          <Star size={13} className="fill-warning-400 text-warning-400" /> {r.rating}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink-2">{r.comment}</p>
                      <p className="mt-1 text-xs text-ink-3">
                        {r.serviceTitle}, {timeAgo(r.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState compact icon={Star} title="No reviews yet" />
              )}
            </Card>
          )}
        </div>
      </div>

      {ac && action ? (
        <ConfirmDialog
          open
          onClose={() => setAction(null)}
          onConfirm={() => setStatus.mutate(action)}
          loading={setStatus.isPending}
          tone={ac.tone}
          title={ac.title}
          confirmLabel={ac.label}
          confirmDisabled={ac.needNote && note.trim().length < 5}
          message={ac.msg}
        >
          {ac.needNote ? <Textarea label="Reason (shared with the provider)" required rows={3} value={note} onChange={(e) => setNote(e.target.value)} /> : null}
        </ConfirmDialog>
      ) : null}
    </>
  );
}
