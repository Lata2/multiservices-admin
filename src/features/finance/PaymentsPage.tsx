import { useNavigate } from 'react-router';
import { Banknote, CreditCard, HandCoins, Percent, ReceiptText, Undo2 } from 'lucide-react';
import { AreaTrend, Donut } from '@/components/charts';
import { CitySelect } from '@/components/domain';
import { ClearFilters, ExportButton, TablePager } from '@/components/domain/ListKit';
import { Badge, Card, CardHeader, DataTable, EmptyState, ErrorState, PageHeader, SearchInput, Segmented, Skeleton, StatCard, Tabs, Toolbar } from '@/components/ui';
import { chartColors, type Tone } from '@/config/theme';
import { useFinanceSummary, useTransactions } from '@/hooks/queries';
import { useCan, usePanel } from '@/hooks/useAccess';
import { useSearchBox } from '@/hooks/useSearchBox';
import { useTableState } from '@/hooks/useTableState';
import { cn } from '@/lib/cn';
import { fetchAll } from '@/lib/fetchAll';
import { formatDateTime, formatMoney, formatMoneyCompact } from '@/lib/format';
import { PAYMENT_METHOD } from '@/lib/status';
import { financeApi } from '@/services/api';
import type { TransactionFilters } from '@/services/api/finance.api';
import type { Transaction, TransactionKind } from '@/types/models';

type F = { kind?: string; city?: string; days?: string };

const KIND: Record<TransactionKind, { label: string; tone: Tone; sign: 1 | -1 }> = {
  payment: { label: 'Payment', tone: 'success', sign: 1 },
  refund: { label: 'Refund', tone: 'info', sign: -1 },
  payout: { label: 'Payout', tone: 'highlight', sign: -1 },
  wallet_credit: { label: 'Wallet credit', tone: 'accent', sign: 1 },
  wallet_debit: { label: 'Wallet debit', tone: 'neutral', sign: -1 },
};
const methodLabel = (m: Transaction['method']) => (m in PAYMENT_METHOD ? PAYMENT_METHOD[m as keyof typeof PAYMENT_METHOD] : m === 'bank' ? 'Bank transfer' : m === 'upi_payout' ? 'UPI payout' : 'Wallet');

export default function PaymentsPage() {
  const t = useTableState<F>({ sort: 'date', dir: 'desc', days: '30' });
  const { params } = t;
  const days = Number(params.days ?? 30);
  const [search, setSearch] = useSearchBox(params.search, t.setSearch);
  const filters = { ...params, days } as unknown as TransactionFilters;
  const s = useFinanceSummary(days);
  const q = useTransactions(filters);
  const can = useCan();
  const navigate = useNavigate();
  const { to } = usePanel();
  const d = s.data;

  return (
    <>
      <PageHeader
        title="Payments"
        description="Money in and out: customer payments, refunds, payouts and wallet movements."
        actions={
          <>
            <Segmented label="Period" value={String(days)} onChange={(v) => t.setFilter('days', v)} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }, { value: '90', label: '90 days' }]} />
            <ExportButton
              filename="transactions"
              load={() => fetchAll(financeApi.transactions, filters)}
              columns={[
                { header: 'Date', value: (r) => r.createdAt },
                { header: 'Type', value: (r) => KIND[r.kind].label },
                { header: 'Reference', value: (r) => r.reference },
                { header: 'Party', value: (r) => r.partyName },
                { header: 'Method', value: (r) => methodLabel(r.method) },
                { header: 'Amount', value: (r) => r.amount * KIND[r.kind].sign },
                { header: 'Status', value: (r) => r.status },
                { header: 'City', value: (r) => r.city },
              ]}
            />
          </>
        }
      />
      {s.isError ? (
        <ErrorState error={s.error} onRetry={() => void s.refetch()} />
      ) : !d ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
            <StatCard label="Collected" value={formatMoneyCompact(d.collected)} icon={CreditCard} tone="primary" hint={`Last ${days} days`} />
            <StatCard label="Platform commission" value={formatMoneyCompact(d.commission)} icon={Percent} tone="success" hint={`Tax collected ${formatMoneyCompact(d.tax)}`} />
            <StatCard label="Refunded" value={formatMoneyCompact(d.refunds)} icon={Undo2} tone="info" hint={d.collected ? `${((d.refunds / d.collected) * 100).toFixed(1)}% of collections` : undefined} />
            <StatCard label="Payouts pending" value={formatMoneyCompact(d.payoutsPending)} icon={HandCoins} tone="accent" hint={`${d.pendingCount} requests`} to={can('payouts.view') ? to('/payouts?status=requested') : undefined} />
          </div>
          <div className="mt-4 grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader title="Collections vs refunds" subtitle={`Last ${days} days`} />
              <AreaTrend data={d.daily} x="label" series={[{ key: 'collected', label: 'Collected', color: chartColors.primary }, { key: 'refunds', label: 'Refunds', color: chartColors.danger }]} yFormat={formatMoneyCompact} format={{ collected: formatMoney, refunds: formatMoney }} height={240} />
            </Card>
            <Card>
              <CardHeader title="Payment methods" subtitle="Share of collections" />
              <Donut data={d.methodMix.map((m) => ({ name: methodLabel(m.method as Transaction['method']), value: m.amount }))} format={formatMoneyCompact} centerValue={formatMoneyCompact(d.collected)} centerLabel="collected" height={160} />
              {d.cashPending ? (
                <p className="mt-4 flex items-center gap-2 rounded-lg bg-accent-50 px-3 py-2 text-sm text-accent-700 dark:bg-accent-500/10 dark:text-accent-300">
                  <Banknote size={15} /> {formatMoney(d.cashPending)} cash still to be collected after service
                </p>
              ) : null}
            </Card>
          </div>
        </>
      )}

      <h2 className="mb-3 mt-7 text-lg font-bold text-ink">Transactions</h2>
      <Tabs
        label="Transaction type"
        className="mb-3"
        value={params.kind ?? 'all'}
        onChange={(v) => t.setFilter('kind', v)}
        tabs={[{ value: 'all', label: 'All' }, ...(Object.keys(KIND) as TransactionKind[]).map((k) => ({ value: k, label: KIND[k].label }))]}
      />
      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Search reference or name…" className="sm:w-64" />
        <CitySelect value={params.city ?? ''} onChange={(e) => t.setFilter('city', e.target.value)} containerClassName="sm:w-36" />
        <ClearFilters show={!!(params.city || params.search)} onClear={() => (setSearch(''), t.setFilters({ city: undefined }), t.setSearch(''))} />
      </Toolbar>
      {q.isError ? (
        <ErrorState error={q.error} onRetry={() => void q.refetch()} />
      ) : (
        <DataTable
          caption="Transactions"
          data={q.data?.items}
          loading={q.isPending}
          fetching={q.isFetching}
          rowKey={(r) => r.id}
          sort={{ key: params.sort, dir: params.dir }}
          onSort={t.setSort}
          onRowClick={(r) => (r.bookingId ? navigate(to(`/bookings/${r.bookingId}`)) : undefined)}
          empty={<EmptyState icon={ReceiptText} title="No transactions in this period" />}
          columns={[
            { key: 'party', header: 'Party', sortKey: 'party', mobile: 'title', cell: (r) => <span className="block"><span className="font-semibold text-ink">{r.partyName}</span><span className="block font-mono text-xs text-ink-3">{r.reference}</span></span> },
            { key: 'kind', header: 'Type', cell: (r) => <Badge tone={KIND[r.kind].tone} size="xs">{KIND[r.kind].label}</Badge> },
            { key: 'method', header: 'Method', hideBelow: 'lg', cell: (r) => methodLabel(r.method) },
            { key: 'city', header: 'City', hideBelow: 'xl', cell: (r) => r.city ?? '—' },
            { key: 'date', header: 'Date', sortKey: 'date', hideBelow: 'md', cell: (r) => <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span> },
            { key: 'status', header: 'Status', hideBelow: 'lg', cell: (r) => <Badge tone={r.status === 'success' ? 'success' : r.status === 'pending' ? 'warning' : 'danger'} dot size="xs">{r.status === 'success' ? 'Settled' : r.status === 'pending' ? 'Pending' : 'Failed'}</Badge> },
            { key: 'amount', header: 'Amount', sortKey: 'amount', align: 'right', mobile: 'aside', cell: (r) => <span className={cn('font-semibold tabular', KIND[r.kind].sign > 0 ? 'text-success-600 dark:text-success-400' : 'text-ink')}>{KIND[r.kind].sign > 0 ? '+' : '−'}{formatMoney(r.amount)}</span> },
          ]}
          footer={<TablePager data={q.data} onPage={t.setPage} onPageSize={t.setPageSize} />}
        />
      )}
    </>
  );
}
