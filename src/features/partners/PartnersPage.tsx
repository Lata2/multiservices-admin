import { useState } from 'react';
import { Bike, CheckCircle2, Phone, Star, XCircle, Ban, RotateCcw } from 'lucide-react';
import { CitySelect } from '@/components/domain';
import { ClearFilters, TablePager } from '@/components/domain/ListKit';
import { Avatar, Badge, Button, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorState, KeyValue, MiniStat, PageHeader, PersonCell, SearchInput, Select, Skeleton, StatusBadge, Tabs, Textarea, Toolbar } from '@/components/ui';
import { usePartner, usePartners } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { formatDate, formatDateTime, formatMoney, formatNumber, titleCase } from '@/lib/format';
import { PROVIDER_STATUS, TASK_STATUS } from '@/lib/status';
import { deliveryApi } from '@/services/api';
import type { PartnerFilters } from '@/services/api/delivery.api';
import type { ProviderStatus } from '@/types/models';

type F = { status?: string; city?: string; online?: string; id?: string };

export default function PartnersPage() {
  const t = useTableState<F>({ sort: 'joined', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = usePartners(params as unknown as PartnerFilters);
  const c = q.data?.counts;
  return (
    <>
      <PageHeader title="Delivery partners" description="Riders handling pickups, drops and spare-part runs." />
      <Tabs
        label="Partner status"
        className="mb-4"
        value={params.status ?? 'all'}
        onChange={(v) => t.setFilter('status', v)}
        tabs={[
          { value: 'all', label: 'All', count: c?.all },
          { value: 'pending', label: 'Pending', count: c?.pending },
          { value: 'approved', label: 'Approved', count: c?.approved },
          { value: 'suspended', label: 'Suspended', count: c?.suspended },
          { value: 'rejected', label: 'Rejected', count: c?.rejected },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search name, phone, vehicle…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
          <Select aria-label="Availability" compact placeholder="Online & offline" value={params.online ?? ''} onChange={(e) => t.setFilter('online', e.target.value)} options={[{ value: 'online', label: `Online now (${c?.online ?? 0})` }, { value: 'offline', label: 'Offline' }]} containerClassName="sm:w-44" />
        </div>
        <ClearFilters show={!!(params.city || params.online || params.search)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Delivery partners"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={(r) => t.setQuery({ id: r.id })}
          empty={<EmptyState icon={Bike} title="No partners found" />}
          columns={[
            {
              key: 'name',
              header: 'Partner',
              sortKey: 'name',
              mobile: 'title',
              cell: (p) => (
                <span className="flex items-center gap-2">
                  <PersonCell name={p.name} sub={p.phone} src={p.avatar} />
                  {p.online ? <span className="h-2 w-2 shrink-0 rounded-full bg-success-500" title="Online" /> : null}
                </span>
              ),
            },
            { key: 'vehicle', header: 'Vehicle', hideBelow: 'lg', cell: (p) => <span><span className="block">{titleCase(p.vehicleType)}</span><span className="text-xs text-ink-3">{p.vehicleNumber}</span></span> },
            { key: 'city', header: 'City', cell: (p) => p.city },
            { key: 'rating', header: 'Rating', sortKey: 'rating', align: 'right', cell: (p) => (p.rating ? `${p.rating.toFixed(1)} ★` : 'New') },
            { key: 'tasks', header: 'Tasks', sortKey: 'tasks', align: 'right', hideBelow: 'lg', cell: (p) => <span className="tabular">{formatNumber(p.completedTasks)}</span> },
            { key: 'earnings', header: 'Earnings', sortKey: 'earnings', align: 'right', hideBelow: 'xl', cell: (p) => <span className="tabular">{formatMoney(p.earnings)}</span> },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (p) => <StatusBadge map={PROVIDER_STATUS} value={p.status} size="xs" /> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
      {params.id ? <PartnerDrawer id={params.id} onClose={() => t.setQuery({ id: undefined })} /> : null}
    </>
  );
}

function PartnerDrawer({ id, onClose }: { id: string; onClose: () => void }) {
  const q = usePartner(id);
  const can = useCan();
  const [action, setAction] = useState<ProviderStatus | null>(null);
  const [note, setNote] = useState('');
  const m = useApiMutation((s: ProviderStatus) => deliveryApi.setPartnerStatus(id, s, note), {
    invalidate: [qk.partners.all, qk.dashboard.admin, qk.lookups, qk.tasks.all],
    success: (_, s) => `Partner ${PROVIDER_STATUS[s].label.toLowerCase()}`,
    onSuccess: () => (setAction(null), setNote('')),
  });
  const p = q.data?.partner;
  const manage = can('partners.manage') && p;
  const needNote = action === 'rejected' || action === 'suspended';
  return (
    <Drawer
      open
      onClose={onClose}
      title={p?.name ?? 'Partner'}
      description={p ? `${p.city}, joined ${formatDate(p.joinedAt)}` : undefined}
      footer={
        manage ? (
          p.status === 'pending' ? (
            <>
              <Button variant="outline" icon={XCircle} onClick={() => setAction('rejected')}>
                Reject
              </Button>
              <Button variant="success" icon={CheckCircle2} onClick={() => setAction('approved')}>
                Approve
              </Button>
            </>
          ) : p.status === 'approved' ? (
            <Button variant="danger" icon={Ban} onClick={() => setAction('suspended')}>
              Suspend
            </Button>
          ) : (
            <Button variant="panel" icon={RotateCcw} onClick={() => setAction('approved')}>
              Reinstate
            </Button>
          )
        ) : undefined
      }
    >
      {!p ? (
        q.isError ? <ErrorState error={q.error} /> : <Skeleton className="h-60" />
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-center gap-3">
            <Avatar name={p.name} src={p.avatar} size="lg" />
            <div>
              <div className="flex items-center gap-2">
                <StatusBadge map={PROVIDER_STATUS} value={p.status} size="xs" />
                {p.online ? <Badge tone="success" dot pulse size="xs">Online</Badge> : <Badge size="xs">Offline</Badge>}
              </div>
              <a href={`tel:${p.phone.replace(/\s/g, '')}`} className="mt-1 flex items-center gap-1.5 text-sm text-ink-2 hover:underline">
                <Phone size={13} /> {p.phone}
              </a>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <MiniStat label="Rating" value={p.rating ? <span className="inline-flex items-center gap-1">{p.rating}<Star size={13} className="fill-warning-400 text-warning-400" /></span> : 'New'} />
            <MiniStat label="Tasks" value={formatNumber(p.completedTasks)} />
            <MiniStat label="Earned" value={formatMoney(p.earnings)} />
          </div>
          <dl className="divide-y divide-line">
            <KeyValue label="Vehicle" value={`${titleCase(p.vehicleType)}, ${p.vehicleNumber}`} />
            <KeyValue label="Licence" value={p.licenseNumber} />
            <KeyValue label="Email" value={p.email} />
          </dl>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Recent tasks</p>
            {(q.data?.tasks ?? []).length ? (
              <ul className="divide-y divide-line rounded-xl border border-line">
                {(q.data?.tasks ?? []).map((tk) => (
                  <li key={tk.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-ink">
                        #{tk.bookingCode} {titleCase(tk.type)}
                      </span>
                      <span className="text-xs text-ink-3">{formatDateTime(tk.scheduledFor)}</span>
                    </span>
                    <StatusBadge map={TASK_STATUS} value={tk.status} size="xs" />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-3">No tasks yet.</p>
            )}
          </div>
        </div>
      )}
      {action ? (
        <ConfirmDialog
          open
          onClose={() => setAction(null)}
          onConfirm={() => m.mutate(action)}
          loading={m.isPending}
          tone={needNote ? 'danger' : 'primary'}
          title={action === 'approved' ? 'Approve partner?' : action === 'rejected' ? 'Reject partner?' : 'Suspend partner?'}
          confirmLabel={action === 'approved' ? 'Approve' : action === 'rejected' ? 'Reject' : 'Suspend'}
          confirmDisabled={needNote && note.trim().length < 5}
          message={action === 'approved' ? 'They can go online and accept tasks right away.' : 'They’ll go offline and any assigned tasks return to the dispatch queue.'}
        >
          {needNote ? <Textarea label="Reason (shared with the partner)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} /> : null}
        </ConfirmDialog>
      ) : null}
    </Drawer>
  );
}
