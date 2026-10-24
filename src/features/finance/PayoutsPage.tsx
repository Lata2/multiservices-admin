import { useState } from 'react';
import { BadgeCheck, Banknote, CheckCheck, Wallet, XCircle } from 'lucide-react';
import { TablePager } from '@/components/domain/ListKit';
import { Badge, Button, ConfirmDialog, DataTable, Dialog, EmptyState, ErrorState, Input, Menu, PageHeader, PersonCell, SearchInput, Select, StatCard, StatusBadge, Tabs, Textarea, Toolbar } from '@/components/ui';
import { usePayouts } from '@/hooks/queries';
import { qk } from '@/hooks/queryKeys';
import { useApiMutation } from '@/hooks/useApiMutation';
import { useCan } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { formatDate, formatMoney, formatMoneyCompact, timeAgo } from '@/lib/format';
import { PAYOUT_STATUS } from '@/lib/status';
import { financeApi } from '@/services/api';
import type { PayoutFilters } from '@/services/api/finance.api';
import type { Payout } from '@/types/models';

type F = { status?: string; role?: string };
const inv = [qk.finance.all, qk.dashboard.admin, qk.providers.all];

export default function PayoutsPage() {
  const t = useTableState<F>({ sort: 'requested', dir: 'desc' });
  const { params } = t;
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const q = usePayouts(params as unknown as PayoutFilters);
  const can = useCan();
  const manage = can('payouts.manage');
  const [selected, setSelected] = useState<string[]>([]);
  const [pay, setPay] = useState<Payout | null>(null);
  const [reject, setReject] = useState<Payout | null>(null);
  const [bulk, setBulk] = useState(false);
  const approve = useApiMutation((id: string) => financeApi.processPayout(id, 'approve'), { invalidate: inv, success: 'Payout approved' });
  const bulkPay = useApiMutation(() => financeApi.bulkPay(selected), { invalidate: inv, success: (r) => `Paid ${r.paid} payouts, ${formatMoney(r.amount)}`, onSuccess: () => (setSelected([]), setBulk(false)) });
  const c = q.data?.counts;
  const items = q.data?.items ?? [];
  const selectedTotal = items.filter((p) => selected.includes(p.id)).reduce((s, p) => s + p.amount, 0);
  const open = (p: Payout) => p.status === 'requested' || p.status === 'approved';

  return (
    <>
      <PageHeader title="Payouts" description="Withdrawal requests from providers and delivery partners." />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Awaiting payment" value={formatMoneyCompact(q.data?.pendingAmount ?? 0)} icon={Wallet} tone="accent" hint={`${(c?.requested ?? 0) + (c?.approved ?? 0)} requests`} />
        <StatCard label="Approved, not paid" value={String(c?.approved ?? 0)} icon={BadgeCheck} tone="primary" hint="Ready for bank transfer" />
        <StatCard label="Paid out" value={String(c?.paid ?? 0)} icon={CheckCheck} tone="success" hint="All time" className="max-lg:col-span-2" />
      </div>
      <Tabs
        label="Payout status"
        className="mb-3"
        value={params.status ?? 'all'}
        onChange={(v) => (setSelected([]), t.setFilter('status', v))}
        tabs={[
          { value: 'all', label: 'All', count: c?.all },
          { value: 'requested', label: 'Requested', count: c?.requested },
          { value: 'approved', label: 'Approved', count: c?.approved },
          { value: 'paid', label: 'Paid', count: c?.paid },
          { value: 'rejected', label: 'Rejected', count: c?.rejected },
        ]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search payee or reference…" className="sm:w-64" />
        <Select aria-label="Payee type" compact placeholder="All payees" value={params.role ?? ''} onChange={(e) => t.setFilter('role', e.target.value)} options={[{ value: 'provider', label: 'Providers' }, { value: 'delivery', label: 'Delivery partners' }]} containerClassName="sm:w-44" />
        {manage && selected.length ? (
          <div className="flex items-center gap-2 rounded-lg bg-panel-soft px-3 py-1.5 sm:ml-auto">
            <span className="text-sm font-semibold text-panel-ink">
              {selected.length} selected, {formatMoney(selectedTotal)}
            </span>
            <Button size="xs" variant="panel" icon={Banknote} onClick={() => setBulk(true)}>
              Pay all
            </Button>
          </div>
        ) : null}
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Payouts"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          selection={manage ? { selected, onChange: setSelected, isSelectable: open } : undefined}
          empty={<EmptyState icon={Wallet} title="No payouts here" description="Requests appear when providers or partners withdraw earnings." />}
          columns={[
            { key: 'payee', header: 'Payee', sortKey: 'payee', mobile: 'title', cell: (p) => <PersonCell name={p.payeeName} sub={p.payeeRole === 'provider' ? 'Provider' : 'Delivery partner'} square={p.payeeRole === 'provider'} /> },
            { key: 'account', header: 'Account', hideBelow: 'lg', cell: (p) => <span><span className="block">{p.method === 'bank' ? 'Bank' : 'UPI'}</span><span className="text-xs text-ink-3">{p.accountRef}</span></span> },
            { key: 'requested', header: 'Requested', sortKey: 'requested', cell: (p) => <span className="whitespace-nowrap">{open(p) ? timeAgo(p.requestedAt) : formatDate(p.requestedAt)}</span> },
            { key: 'ref', header: 'Reference', hideBelow: 'xl', cell: (p) => (p.utr ? <code className="text-xs">{p.utr}</code> : p.note ? <span className="text-xs text-danger-600">{p.note}</span> : '—') },
            { key: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', cell: (p) => <span className="font-semibold tabular text-ink">{formatMoney(p.amount)}</span> },
            { key: 'status', header: 'Status', mobile: 'aside', cell: (p) => <StatusBadge map={PAYOUT_STATUS} value={p.status} size="xs" /> },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              mobile: false,
              cell: (p) =>
                manage && open(p) ? (
                  <span className="inline-flex items-center gap-1">
                    <Button size="xs" variant="soft" onClick={() => setPay(p)}>
                      Pay
                    </Button>
                    <Menu
                      items={[
                        { label: 'Approve', icon: BadgeCheck, onSelect: () => approve.mutate(p.id), hidden: p.status !== 'requested' },
                        { label: 'Reject', icon: XCircle, tone: 'danger', onSelect: () => setReject(p) },
                      ]}
                    />
                  </span>
                ) : null,
            },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
      {pay ? <PayDialog payout={pay} onClose={() => setPay(null)} /> : null}
      {reject ? <RejectDialog payout={reject} onClose={() => setReject(null)} /> : null}
      <ConfirmDialog open={bulk} onClose={() => setBulk(false)} onConfirm={() => bulkPay.mutate()} loading={bulkPay.isPending} title="Pay selected payouts?" confirmLabel={`Pay ${formatMoney(selectedTotal)}`} icon={Banknote} message={`${selected.length} transfers will be initiated and each payee notified. Reference numbers are generated automatically.`} />
    </>
  );
}

function PayDialog({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [utr, setUtr] = useState('');
  const valid = !utr || /^[A-Z0-9]{6,22}$/i.test(utr);
  const m = useApiMutation(() => financeApi.processPayout(payout.id, 'pay', { utr }), { invalidate: inv, success: `Paid ${formatMoney(payout.amount)} to ${payout.payeeName}`, onSuccess: onClose });
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Mark as paid"
      description={`${formatMoney(payout.amount)} to ${payout.payeeName}`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="panel" icon={Banknote} disabled={!valid} loading={m.isPending} onClick={() => m.mutate()}>
            Mark paid
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between rounded-xl bg-surface-2 px-3 py-2.5 text-sm">
          <span className="text-ink-3">{payout.method === 'bank' ? 'Bank account' : 'UPI ID'}</span>
          <Badge>{payout.accountRef}</Badge>
        </div>
        <Input label="UTR / transfer reference" value={utr} onChange={(e) => setUtr(e.target.value.toUpperCase())} error={valid ? undefined : '6–22 letters or numbers'} hint="Leave empty to auto-generate" />
      </div>
    </Dialog>
  );
}

function RejectDialog({ payout, onClose }: { payout: Payout; onClose: () => void }) {
  const [note, setNote] = useState('');
  const m = useApiMutation(() => financeApi.processPayout(payout.id, 'reject', { note }), { invalidate: inv, success: 'Payout rejected', onSuccess: onClose });
  return (
    <ConfirmDialog open onClose={onClose} onConfirm={() => m.mutate()} loading={m.isPending} tone="danger" title="Reject payout?" confirmLabel="Reject" confirmDisabled={note.trim().length < 5} message={`${formatMoney(payout.amount)} requested by ${payout.payeeName}. The balance stays in their wallet.`}>
      <Textarea label="Reason (shared with the payee)" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
    </ConfirmDialog>
  );
}
