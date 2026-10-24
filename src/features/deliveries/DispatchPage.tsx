import { useState } from 'react';
import { ArrowDown, Ban, PackageCheck, UserMinus, UserPlus } from 'lucide-react';
import { CitySelect } from '@/components/domain';
import { ClearFilters, TablePager } from '@/components/domain/ListKit';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, Input, Menu, PageHeader, SearchInput, Select, StatusBadge, Tabs, Toolbar } from '@/components/ui';
import { useLookups, useTasks } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { cn } from '@/lib/cn';
import { formatDateTime, formatMoney, titleCase } from '@/lib/format';
import { TASK_STATUS } from '@/lib/status';
import { deliveryApi } from '@/services/api';
import type { TaskFilters } from '@/services/api/delivery.api';
import type { DeliveryTask } from '@/types/models';

type F = { status?: string; city?: string; type?: string };
const inv = [qk.tasks.all, qk.dashboard.admin, qk.partners.all];

export default function DispatchPage() {
  const t = useTableState<F>({ sort: 'scheduled', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = useTasks(params as unknown as TaskFilters);
  const can = useCan();
  const manage = can('deliveries.manage');
  const [assign, setAssign] = useState<DeliveryTask | null>(null);
  const [cancel, setCancel] = useState<DeliveryTask | null>(null);
  const unassign = useApiMutation((id: string) => deliveryApi.unassign(id), { invalidate: inv, success: 'Partner unassigned' });
  const c = q.data?.counts;

  return (
    <>
      <PageHeader title="Dispatch" description="Pickup, drop and parts tasks created by bookings that need a delivery partner." />
      <Tabs
        label="Task status"
        className="mb-4"
        value={params.status ?? 'all'}
        onChange={(v) => t.setFilter('status', v)}
        tabs={[
          { value: 'all', label: 'All', count: c?.all },
          { value: 'available', label: 'Unassigned', count: c?.available },
          { value: 'accepted', label: 'Assigned', count: c?.accepted },
          { value: 'picked_up', label: 'In transit', count: c?.picked_up },
          { value: 'delivered', label: 'Delivered', count: c?.delivered },
          { value: 'cancelled', label: 'Cancelled', count: c?.cancelled },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search booking, name, partner…" className="sm:w-64" />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
          <Select aria-label="Type" compact placeholder="All types" value={params.type ?? ''} onChange={(e) => t.setFilter('type', e.target.value)} options={['pickup', 'drop', 'parts'].map((v) => ({ value: v, label: titleCase(v) }))} containerClassName="sm:w-32" />
        </div>
        <ClearFilters show={!!(params.city || params.type || params.search)} onClear={() => (setSearch(''), t.reset())} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Delivery tasks"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          empty={<EmptyState icon={PackageCheck} title="No tasks here" description="Tasks appear when customers book pickup services like laundry or car servicing." />}
          columns={[
            {
              key: 'task',
              header: 'Task',
              mobile: 'title',
              cell: (r) => (
                <span className="block">
                  <span className="flex items-center gap-1.5">
                    <span className="font-semibold text-ink">#{r.bookingCode}</span>
                    <Badge size="xs" tone={r.type === 'parts' ? 'highlight' : r.type === 'drop' ? 'info' : 'primary'}>
                      {titleCase(r.type)}
                    </Badge>
                  </span>
                  <span className="block max-w-56 truncate text-xs text-ink-3">{r.itemsSummary}</span>
                </span>
              ),
            },
            {
              key: 'route',
              header: 'Route',
              hideBelow: 'lg',
              mobile: false,
              cell: (r) => (
                <span className="flex max-w-64 flex-col text-sm">
                  <span className="truncate text-ink">{r.pickup.name}</span>
                  <ArrowDown size={11} className="my-0.5 text-ink-3" />
                  <span className="truncate text-ink">{r.drop.name}</span>
                </span>
              ),
            },
            { key: 'partner', header: 'Partner', cell: (r) => (r.partnerName ? <span className="font-medium text-ink">{r.partnerName}</span> : <span className="text-accent-600">Unassigned</span>) },
            { key: 'scheduled', header: 'Scheduled', sortKey: 'scheduled', cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.scheduledFor)}</span> },
            {
              key: 'fee',
              header: 'Fee',
              sortKey: 'fee',
              align: 'right',
              hideBelow: 'xl',
              cell: (r) => (
                <span className="tabular">
                  {formatMoney(r.fee)}
                  {r.codAmount ? <span className="block text-xs text-accent-600">COD {formatMoney(r.codAmount)}</span> : null}
                </span>
              ),
            },
            { key: 'distance', header: 'Distance', sortKey: 'distance', align: 'right', hideBelow: 'xl', cell: (r) => `${r.distanceKm} km` },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (r) => <StatusBadge map={TASK_STATUS} value={r.status} size="xs" /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              mobile: false,
              cell: (r) =>
                manage && ['available', 'accepted', 'picked_up'].includes(r.status) ? (
                  <span className="inline-flex items-center gap-1">
                    {r.status === 'available' ? (
                      <Button size="xs" variant="soft" icon={UserPlus} onClick={() => setAssign(r)}>
                        Assign
                      </Button>
                    ) : null}
                    <Menu
                      items={[
                        { label: 'Reassign partner', icon: UserPlus, onSelect: () => setAssign(r), hidden: r.status !== 'accepted' },
                        { label: 'Unassign', icon: UserMinus, onSelect: () => unassign.mutate(r.id), hidden: r.status !== 'accepted' },
                        { label: 'Cancel task', icon: Ban, tone: 'danger', onSelect: () => setCancel(r) },
                      ]}
                    />
                  </span>
                ) : null,
            },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
      {assign ? <AssignDialog task={assign} onClose={() => setAssign(null)} /> : null}
      {cancel ? <CancelTask task={cancel} onClose={() => setCancel(null)} /> : null}
    </>
  );
}

function AssignDialog({ task, onClose }: { task: DeliveryTask; onClose: () => void }) {
  const partners = (useLookups().data?.partners ?? []).filter((p) => p.status === 'approved' && p.city === task.city).sort((a, b) => Number(b.online) - Number(a.online));
  const [id, setId] = useState(task.partnerId ?? '');
  const m = useApiMutation(() => deliveryApi.assign(task.id, id), { invalidate: inv, success: 'Partner assigned', onSuccess: onClose });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title={`Assign #${task.bookingCode}`}
      description={`${titleCase(task.type)} in ${task.city}, ${task.distanceKm} km, fee ${formatMoney(task.fee)}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" disabled={!id || id === task.partnerId} loading={m.isPending} onClick={() => m.mutate()}>
            Assign partner
          </Button>
        </>
      }
    >
      {partners.length ? (
        <ul role="radiogroup" aria-label="Partners" className="flex flex-col gap-1.5">
          {partners.map((p) => (
            <li key={p.id}>
              <button type="button" role="radio" aria-checked={id === p.id} onClick={() => setId(p.id)} className={cn('focus-ring flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left transition-colors', id === p.id ? 'border-panel bg-panel-soft' : 'border-line hover:border-line-strong')}>
                <span className="font-medium text-ink">{p.name}</span>
                {p.online ? <Badge tone="success" dot size="xs">Online</Badge> : <Badge size="xs">Offline</Badge>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-lg bg-surface-2 p-3 text-sm text-ink-2">No approved partners in {task.city}.</p>
      )}
    </Dialog>
  );
}

function CancelTask({ task, onClose }: { task: DeliveryTask; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const m = useApiMutation(() => deliveryApi.cancelTask(task.id, reason), { invalidate: inv, success: 'Task cancelled', onSuccess: onClose });
  return (
    <ConfirmDialog open onClose={onClose} onConfirm={() => m.mutate()} loading={m.isPending} tone="danger" title="Cancel task?" confirmLabel="Cancel task" confirmDisabled={reason.trim().length < 3} message={`#${task.bookingCode}: ${task.itemsSummary}`}>
      <Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer will drop off themselves" />
    </ConfirmDialog>
  );
}
